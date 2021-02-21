/**
 * Created by Jordi Cenzano 2020/12/06
 */

const child_process = require('child_process');
const aws = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const tempy = require('tempy');
const LiveTranscoderConfig = require('./live-transcoder-config');
const {LiveTranscoderChunkData, ChunkData} = require('./live-transcoder-chunk-data');

const s3 = new aws.S3({ apiVersion: '2006-03-01' });

const ffmpegData = {
    LAMBDA_SRC: './ffmpeg/ffmpeg',
    LAMBDA_DST: '/tmp/ffmpeg.linux64',
    LOCAL: 'ffmpeg',
    path: ''
}

const fontData = {
    LAMBDA_SRC: './fonts/GeorgiaPro-Black.ttf',
    LAMBDA_DST: '/tmp/GeorgiaPro-Black.ttf',
    LOCAL: './fonts/GeorgiaPro-Black.ttf',
    path: ''
}

const CMD_OUT_STDERR = 'stderr';
const CMD_OUT_STDOUT = 'stdout';

const s3MetadataHeaders = {
    SEQ_NUMBER: 'joc-hls-chunk-seq-number',
    TARGET_DURATION_MS: 'joc-hls-targetduration-ms',
    DURATION_MS: 'joc-hls-duration-ms',
    WALL_CLOCK_NS: 'joc-hls-createdat-ns'
}

const dbbConfigDataDefault = {
    // General 
    region: 'us-east-1',
    
    // Config
    configName: 'default',
    tableName: 'joc-dist-live-config',
}
const dbbChunksDataDefault = {
    // General 
    region: 'us-east-1',

    // Chunks
    tableName: 'joc-dist-live-chunks',
}

// ABR data manipulation
class ABRData {
    constructor(s3Bucket, srcS3ObjectKey, srcLocalFilePath) {
        this._s3Bucket = s3Bucket;
        this._srcS3ObjectKey = srcS3ObjectKey;
        this._srcLocalFilePath = srcLocalFilePath;
        this._srcS3Metadata = {};
        this._renditionsData = [];
        this._ffmpegArgs = [];
    }

    get s3Bucket() { return this._s3Bucket; }
    get srcS3ObjectKey() { return this._srcS3ObjectKey; }
    get srcLocalFilePath() { return this._srcLocalFilePath; }
    get srcS3Metadata() { return this._srcS3Metadata; }
    get renditionsData() { return this._renditionsData; }
    get ffmpegArgs() { return this._ffmpegArgs; }

    set srcS3Metadata(v) { this._srcS3Metadata = v; }
    set ffmpegArgs(v) { this._ffmpegArgs = v; }

    addRenditionData(dstLocalFilePath, dstS3Bucket, srcS3ObjectKey, s3OutputPrefix, rendition) {
        this._renditionsData.push({ 
            localFilePath: dstLocalFilePath,
            dstS3Bucket: dstS3Bucket,
            dstS3ObjectKey: createDstS3ObjectKey(srcS3ObjectKey, s3OutputPrefix, rendition.ID),
            rendition: rendition
        });
    }
}

const logType = {
    INFO: 'info',
    WARN: 'warn',
    ERR: 'err'
};
// Log function
function logData(type, msg, streamID, objKey, durationMs, data) {
    let dataStr = `[${msg}] [${streamID}] [${objKey}] [${durationMs}]`;
    if (typeof(data) != 'undefined') {
        dataStr = dataStr + ` ${JSON.stringify(data, null, 2)}`;
    }
    if (type === logType.WARN) {
        console.warn(dataStr);
    } else if (type === logType.ERR) {
        console.error(dataStr);
    }
    else {
        console.log(dataStr);
    }
}

// Lambda is new
const lambdaGUID = uuidv4(); 
logData(logType.INFO, 'Loading function', '', '', 0, lambdaGUID);

// Entry point
exports.handler = async (event, context) => {
    logData(logType.INFO, 'Received event', '', '', 0, event);

    context.ffmpegData = ffmpegData;
    context.fontData = fontData;

    // Prepare ffmpeg if necessary
    prepareFfmpeg(context);
    testFfmpeg(context);

    // Update DDB configs
    const dbbConfigData = parseDDBConfig(process.env, dbbConfigDataDefault);
    const dbbChunksData = parseDDBChunks(aaa, dbbChunksDataDefault);

    // Fetch config and return it
    const transcoderConfig = new LiveTranscoderConfig()
    await transcoderConfig.loadFromDDB(dbbConfigData.region, dbbConfigData.tableName, dbbConfigData.configName);
    logData(logType.INFO, 'Fetched config', '', '', 0, transcoderConfig.toString());

    const ret = [];
    const numRecords = event.Records.length;
    if (numRecords <= 0) {
        logData(logType.WARN, 'No records to process' , '', '' , 0);
    }
    else {
        for (let r = 0; r < numRecords; r++) {
            // Process one after the other
            logData(logType.INFO, 'Processing record', '', '', 0, `${r}/${numRecords}`);
            retRecord = await processRecord(event.Records[r], dbbChunksData, transcoderConfig, context)
            ret.push(retRecord);
        }    
    }

    event.returnedResult = ret;

    return event;
}

async function processRecord(record, dbbChunksData, transcoderConfig, context) {
    return new Promise( (resolutionFunc, rejectionFunc) => {
        const timers = {
            'start': 0,
            'downloadFromS3': 0,
            'getMetadataS3': 0,
            'localTranscode': 0,
            'uploadedToS3': 0,
            'updatedDDB': 0,
            'final': 0
        };
        timers.start = getTimeInMilliseconds();

        const bucket = getBucket(record);
        const objectKey = getObjectKey(record);
        const streamID = getStreamIDFromObjectKey(objectKey);
        const localTmpFilePathInput = tempy.file();
            
        logData(logType.INFO, 'Downloading from s3', streamID, objectKey, 0, {s3: `s3://${bucket}/${objectKey}`, dst: localTmpFilePathInput});
        
        // Object to store transcoding output data
        const abrData = new ABRData(bucket, objectKey, localTmpFilePathInput);

        // Download from S3
        downloadS3Object(bucket, objectKey, localTmpFilePathInput)
        .then(res => {
            timers.downloadFromS3 = getTimeInMilliseconds();
            logData(logType.INFO, 'Downloaded from s3', streamID, objectKey, timers.downloadFromS3 - timers.start, {s3: `s3://${bucket}/${objectKey}`, dst: localTmpFilePathInput});

            // Get S3 obj metadata
            return getS3ObjectMetadata(bucket, objectKey);
        })
        .then(s3ObjMetadata => {
            abrData.srcS3Metadata = s3ObjMetadata;
          
            timers.getMetadataS3 = getTimeInMilliseconds();
            logData(logType.INFO, 'Got metadata from s3', streamID, objectKey, timers.getMetadataS3 - timers.downloadFromS3, {s3: `s3://${bucket}/${objectKey}`, dst: localTmpFilePathInput});

            // Decide destination bucket (if not configured use source bucket)
            let dstS3Bucket = transcoderConfig.getParamDefault('dstS3Bucket', bucket);
            
            // Create transcoding settings
            const transcodeData = createTranscodeData(abrData.srcLocalFilePath, transcoderConfig, context, abrData.srcS3Metadata);
            abrData.ffmpegArgs = transcodeData.ffmpegArgs;
            transcodeData.dstFilesData.forEach(dstFileData => {
                abrData.addRenditionData(dstFileData.dstLocalFilePath, dstS3Bucket, abrData.srcS3ObjectKey, transcoderConfig.getParam('s3OutputPrefix'), dstFileData.rendition);
            });
            
            // Transcode locally
            return createChunkABR(abrData.ffmpegArgs, context);
        })
        .then(res => {
            timers.localTranscode = getTimeInMilliseconds();

            const transcodedLocalFiles = abrData.renditionsData.map(rendition => {return rendition.localFilePath;});
            logData(logType.INFO, 'Locally transcoded', streamID, objectKey, timers.localTranscode - timers.downloadFromS3, {src: abrData.srcLocalFilePath, dst: transcodedLocalFiles});

            // Upload ABR to S3
            let uploadMetadata = {};
            if (transcoderConfig.getParam('copyOriginalMetadataToABRChunks')) {
                uploadMetadata = abrData.srcS3Metadata;
            }
            return uploadS3Objects(bucket, abrData, uploadMetadata, transcoderConfig.getParam('publicReadToABRChunks'), transcoderConfig.getParam('copyOriginalContentTypeToABRChunks'));
        })
        .then(res => {
            timers.uploadedToS3 = getTimeInMilliseconds();

            const transcodedLocalFiles = abrData.renditionsData.map(rendition => {return rendition.localFilePath;});
            const uploadedKeys = abrData.renditionsData.map(rendition => {return rendition.dstS3ObjectKey;});
            logData(logType.INFO, 'Uploaded to S3', streamID, objectKey, timers.uploadedToS3 - timers.localTranscode, {src: transcodedLocalFiles, dst: uploadedKeys});

            return ddbUpdateChunks(dbbChunksData, abrData);
        })
        .then(res => {
            timers.updatedDDB = getTimeInMilliseconds();
            logData(logType.INFO, 'Updated DDB', streamID, objectKey, timers.updatedDDB - timers.uploadedToS3);

            // Clean up
            fileCleanupSync(abrData);
    
            timers.final = getTimeInMilliseconds();
            logData(logType.INFO, 'SUCCEEDED', streamID, objectKey, timers.final - timers.start);
            return resolutionFunc(abrData);
        })
        .catch(err => {
            fileCleanupSync(abrData);

            timers.final = getTimeInMilliseconds();
            logData(logType.ERR, 'ERROR', streamID, objectKey, timers.final - timers.start);
            return rejectionFunc(err);
        })
    });
}

async function createChunkABR(ffmpegArgs, context) {
    return new Promise( (resolutionFunc, rejectionFunc) => {
        try {
            execInternalSync(context.ffmpegData.path, ffmpegArgs);

            return resolutionFunc(true);
        }
        catch(e) {
            return rejectionFunc(e);
        }
    });
}

function createDstS3ObjectKey(srcS3ObjectKey, s3ABRPath, renditionID) {
    const srcObjPath = path.dirname(srcS3ObjectKey);
    const srcObjFile = path.basename(srcS3ObjectKey);

    // From: 
    //    input/1234/A/a.ts
    // To:
    //    output/1234/A/a.ts

    // Remove initial directory
    const dirs = srcObjPath.split('/');
    if (dirs.length >= 1) {
        delete dirs[0];
    }        
    return path.join(s3ABRPath, dirs.join('/'), renditionID, srcObjFile);
}

// Creates transcode command args
function createTranscodeData(srcLocalFilePath, transcoderConfig, context, srcS3Metadata) {
    const ffmpegArgs = [];
    const dstFilesData = [];

    // Base options (sync)
    ffmpegInitSyncArgs = ['-hide_banner', '-y', '-i', srcLocalFilePath, '-vsync', '0', '-copyts'];

    // Add pix_fmt for processing
    ffmpegInitSyncArgs.push('-pix_fmt', transcoderConfig.getParam('video_pix_fmt'));
    
    ffmpegArgs.push(...ffmpegInitSyncArgs);

    ffmpegRenditionArgs = [];
    for (let n = 0; n < transcoderConfig.getParam('renditions').length; n++) {
        const rendition = transcoderConfig.getParam('renditions')[n];
        
        // Overlay options
        ffmpegOverlayArgs = [];
        if (transcoderConfig.getParam('overlayEncodingData')) {
            const fontPath = getFontPath(context);
            let overlayString = `Lane ${rendition.width}x${rendition.height}@${rendition.video_h264_preset}-${rendition.video_h264_profile}-${rendition.video_crf}-${Math.floor(rendition.video_maxrate/1024)}Kbps`;
            let ffmpegOverlayArgStr = 'drawtext=fontfile=' + fontPath + ':text=\'' + overlayString + '\':x=20:y=20:fontsize=60:fontcolor=pink:box=1:boxcolor=0x00000099'
            
            if (typeof(srcS3Metadata === 'object') && typeof(srcS3Metadata.Metadata === 'object')) {
                const seqNum = extractFromMetadataHeader(srcS3Metadata.Metadata, s3MetadataHeaders.SEQ_NUMBER);
                const wallClockNs = extractFromMetadataHeader(srcS3Metadata.Metadata, s3MetadataHeaders.WALL_CLOCK_NS);
                const durationMs = extractFromMetadataHeader(srcS3Metadata.Metadata, s3MetadataHeaders.DURATION_MS);

                const overlayStringChunkData = `nSeq ${seqNum}-Dur ${(durationMs / 1000).toFixed(3)}-Ingested at ${new Date(wallClockNs/1000000).toUTCString()}`;
                ffmpegOverlayArgStr = ffmpegOverlayArgStr + ',' + 'drawtext=fontfile=' + fontPath + ':text=\'' + overlayStringChunkData.replace(/:/g, '') + '\':x=20:y=85:fontsize=60:fontcolor=pink:box=1:boxcolor=0x00000099'
            }
            ffmpegOverlayArgs = ['-vf', ffmpegOverlayArgStr];
        }

        // Video encoding & scale
        ffmpegVideoEncArgs = ['-s', `${rendition.width}x${rendition.height}`, '-c:v', 'libx264', '-preset', rendition.video_h264_preset, '-profile:v', rendition.video_h264_profile, '-crf', rendition.video_crf, '-maxrate', rendition.video_maxrate, '-bufsize', rendition.video_buffersize, '-b-pyramid', rendition.video_h264_bpyramid];

        //x264-params
        ffmpegx264ParamsArgs = [];
        if (typeof(rendition.video_x264_params) === 'string') {
            ffmpegx264ParamsArgs.push('-x264-params', rendition.video_x264_params)
        }

        // Audio encoding
		// TODO:
		// The audio is transmuxed due to a problem in ffmpeg re-encoding
		// If we transcode the audio it creates small timestamp misalignment
        // between original and transcoded version
        // Also it is a workaround for audio primming
        ffmpegAudioEncArgs = ['-c:a', 'copy'];

        // Muxer
        ffmpegMuxArgs = ['-f', 'mpegts', '-mpegts_copyts', '1']

        // Output
        // input A/B/file.ts
        // output A/B/file.ts-480p
        const dstLocalFilePath = srcLocalFilePath + '-' + rendition.ID;
        ffmpegOutputArgs = [dstLocalFilePath];
        dstFilesData.push({dstLocalFilePath: dstLocalFilePath, rendition: rendition});

        // Adds all args
        ffmpegArgs.push(...ffmpegOverlayArgs);
        ffmpegArgs.push(...ffmpegVideoEncArgs);
        ffmpegArgs.push(...ffmpegx264ParamsArgs);
        ffmpegArgs.push(...ffmpegAudioEncArgs);
        ffmpegArgs.push(...ffmpegMuxArgs);
        ffmpegArgs.push(...ffmpegOutputArgs);
    }

    return {ffmpegArgs: ffmpegArgs, dstFilesData: dstFilesData};
}

function getFontPath(context) {
    return context.fontData.path;
}

function fileCleanupSync(abrData) {
    if (fs.existsSync(abrData.srcLocalFilePath)) {
        fs.unlinkSync(abrData.srcLocalFilePath);
    }
    for (var i = 0; i < abrData.renditionsData.length; i++) {
        const rendition = abrData.renditionsData[i];
        if (fs.existsSync(rendition.localFilePath)) {
            fs.unlinkSync(rendition.localFilePath);
        }
      }
}

async function uploadS3Objects(bucket, abrData, metadata, publicRead, copyContentType) {
    const promisesS3Uploads = [];
    for (let n = 0; n < abrData.renditionsData.length; n++) {
        const srcFilePath = abrData.renditionsData[n].localFilePath;
        const objKey = abrData.renditionsData[n].dstS3ObjectKey;

        const p = uploadS3Object(bucket, objKey, srcFilePath, metadata, publicRead, copyContentType);
        promisesS3Uploads.push(p);
    }
    return Promise.all(promisesS3Uploads);
}

// S3 functions

async function uploadS3Object(bucket, objectKey, localFilePath, metadata, publicRead, copyContentType) {
    // Setting up S3 upload parameters
    const params = {
        Bucket: bucket,
        Key: objectKey,
        Body: fs.readFileSync(localFilePath)
    };
    if (publicRead) {
        params.ACL = 'public-read';
    }
    if (Object.entries(metadata.Metadata).length > 0) {
        params.Metadata = metadata.Metadata;
    }
    if (copyContentType) {
        params.ContentType = metadata.ContentType;
    }
    // Uploading files to the bucket
    return s3.upload(params).promise();
}

async function getS3ObjectMetadata(bucket, objectKey) {
    return await s3.headObject({Bucket: bucket, Key: objectKey}).promise();
}

async function downloadS3Object(bucket, objectKey, localPathFile) {
    return new Promise( (resolutionFunc,rejectionFunc) => {
        try {
            const fileStream = fs.createWriteStream(localPathFile);
            const s3Stream = s3.getObject({
                Bucket: bucket,
                Key: objectKey}
            ).createReadStream();
    
            // Listen for errors returned by the service
            s3Stream.on('error', function(err) {
                throw err;
            });
            s3Stream.pipe(fileStream).on('error', function(err) {
                throw err;
            }).on('close', function() {
                return resolutionFunc(localPathFile);
            });
        } catch (e) {
            return rejectionFunc(err);
        }
    });
}

// Helper functions

function parseDDBConfig(envVars, defaultDBBConfig) {
    ret = defaultDBBConfig;
    if ((typeof(envVars.AWS_REGION) === 'string') && (envVars.AWS_REGION != "")) {
        ret.region = envVars.AWS_REGION;
    }
    if ((typeof(envVars.DDB_CONFIG_TABLE_NAME) === 'string') && (envVars.DDB_CONFIG_TABLE_NAME != "")) {
        ret.tableName = envVars.DDB_CONFIG_TABLE_NAME;
    }

    console.log(`Dynamo table config data: ${json.stringify(ret)}`);

    return ret;
}

function parseDDBChunks(envVars, defaultDBBChunks) {
    ret = defaultDBBChunks;
    if ((typeof(envVars.AWS_REGION) === 'string') && (envVars.AWS_REGION != "")) {
        ret.region = envVars.AWS_REGION;
    }
    if ((typeof(envVars.DDB_CONFIG_TABLE_CHUNKS) === 'string') && (envVars.DDB_CONFIG_TABLE_CHUNKS != "")) {
        ret.tableName = envVars.DDB_CONFIG_TABLE_CHUNKS;
    }

    console.log(`Dynamo table chunks data: ${json.stringify(ret)}`);

    return ret;
}

function extractFromMetadataHeader(srcMetadata, name) {
    if (!(name in srcMetadata)) {
        throw new Error(`Error extracting ${name} from metadata: ${JSON.stringify(srcMetadata)}`);
    }
    return srcMetadata[name];
}

function getPlaybackPathFromObjectKey(s3ObjKey) {
    // We assume is the 1nd directory
    // Ingest
    // input/streamID/chunk.ts
    // Output
    // output/streamID/chunk.ts
    // Playback
    // https://CDN-preprend/streamID/chunk.ts (FilePath = streamID/chunk.ts)
    const dirItems = s3ObjKey.split('/');
    if (dirItems.length < 1) {
        throw new Error (`Could not extract playback path from ${s3ObjKey}`);
    }
    dirItems.shift();
    return dirItems.join("/");
}

function getStreamIDFromObjectKey(s3ObjKey) {
    // We assume is the 2nd directory
    // Ingest
    // input/streamID/chunk.ts\
    const dirItems = s3ObjKey.split('/');
    if (dirItems.length < 2) {
        throw new Error (`Could not extract streamID from ${s3ObjKey}`);
    }
    return dirItems[1];
}

function getTimeInMilliseconds() {
    const hrTime = process.hrtime()
    return hrTime[0] * 1000 + hrTime[1] / 1000000;
}

function isLocalDebug(context) {
    if (('isLocalDebug' in context) && (context.isLocalDebug)) {
        return true;
    }
    return false;
}

function getBucket(record) {
    return record.s3.bucket.name;
}

function getObjectKey(record) {
    return decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
}

function execInternalSync(cmd, args, verbose_level) {
    var verbose_level = typeof (verbose_level) !== 'undefined' ? verbose_level : 1;

    // Keeping low level logs not structured
    if (verbose_level >= 1) {
        console.log(`${cmd} ${args.join(" ")}`);
    }

    const process = child_process.spawnSync(cmd, args);
    if (process == null)
        throw new Error("process null");

    if (verbose_level >= 1) {
        console.log("StdOut: " + getOutputFromProcess(CMD_OUT_STDOUT, process));
        console.log("StdErr: " + getOutputFromProcess(CMD_OUT_STDERR, process));
    }
    if (process.status != 0) {
        throw new Error(getOutputFromProcess(CMD_OUT_STDERR, process), process.status);
    }
    return process.status;
}

function getOutputFromProcess(type, process) {
    let ret = '';
    if (process != null) {
        if ((type in process) && (process[type] != null) && (process[type].toString() != "")) {
            ret = process[type].toString();
        }
    }
    return ret;
}

// Lambda ffmpeg helpers

function testFfmpeg(context) {
    if (context.testFfmpeg) {
        execInternalSync(context.ffmpegData.path, ['-h']);
    }
}

function prepareFfmpeg(context) {
    if (!isLocalDebug(context)) {    
        // Copy ffmpeg if does NOT exists in dst
        if (fs.existsSync(context.ffmpegData.LAMBDA_DST) == false) {
            execInternalSync('cp', [context.ffmpegData.LAMBDA_SRC, context.ffmpegData.LAMBDA_DST]);
            execInternalSync('chmod', ['+x', context.ffmpegData.LAMBDA_DST]);
            
        }
        context.ffmpegData.path = context.ffmpegData.LAMBDA_DST;

        if (fs.existsSync(context.fontData.LAMBDA_DST) == false) {
            execInternalSync('cp', [context.fontData.LAMBDA_SRC, context.fontData.LAMBDA_DST]);
        }
        context.fontData.path = context.fontData.LAMBDA_DST;
    }
    else {
        context.ffmpegData.path = context.ffmpegData.LOCAL;
        context.fontData.path = context.fontData.LOCAL;
    }
}

// Chunks helper
async function ddbUpdateChunks(dbbChunksData, abrData) {
    const chunkData = new LiveTranscoderChunkData();

    chunkData.setDDB(dbbChunksData.region, dbbChunksData.tableName);

    dbbUpdatePromises = [];
    const srcMetadata = abrData.srcS3Metadata.Metadata;
    const seqNum = extractFromMetadataHeader(srcMetadata, s3MetadataHeaders.SEQ_NUMBER);
    const wallClockNs = extractFromMetadataHeader(srcMetadata, s3MetadataHeaders.WALL_CLOCK_NS);
    const durationMs = extractFromMetadataHeader(srcMetadata, s3MetadataHeaders.DURATION_MS);
    const targetDurationMs = extractFromMetadataHeader(srcMetadata, s3MetadataHeaders.TARGET_DURATION_MS);

    for (let n = 0; n < abrData.renditionsData.length; n++) {
        const renditionData = abrData.renditionsData[n];
        const chunk = new ChunkData(
            renditionData.dstS3Bucket, 
            renditionData.dstS3ObjectKey,
            getPlaybackPathFromObjectKey(renditionData.dstS3ObjectKey),
            getStreamIDFromObjectKey(renditionData.dstS3ObjectKey),
            seqNum,
            renditionData.rendition.ID,
            wallClockNs,
            targetDurationMs,
            durationMs);

        const p = chunkData.saveChunk(chunk);
        dbbUpdatePromises.push(p);
    }
    return Promise.all(dbbUpdatePromises);
}