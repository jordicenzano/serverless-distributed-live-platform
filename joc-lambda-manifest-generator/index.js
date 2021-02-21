/**
 * Created by Jordi Cenzano 2020/12/06
 */

const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const querystring = require("querystring");
const LiveTranscoderConfig = require('./live-transcoder-config');

const DDB_MAX_RETRIES_DEF = 3;

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

const logType = {
    INFO: 'info',
    WARN: 'warn',
    ERR: 'err'
};

// Log function
function logData(type, msg, streamID, durationMs, data) {
    let dataStr = `[${msg}] [${streamID}] [${durationMs}]`;
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
logData(logType.INFO, 'Loading function', '', 0, lambdaGUID);

const CONTENT_TYPE_M3U8 = 'application/vnd.apple.mpegurl';
const CONTENT_TYPE_STR = 'text/plain';
const MAX_AGE_S_DEF = 4; // Applied for error and main manifest

const manifestType = {
    NONE: 'none',
    MANIFEST: 'manifest',
    CHUNKLIST: 'chunklist'
}

const liveType = {
    LIVE: 'live',
    EVENT: 'event',
    VOD: 'vod'
}

const filterFromManifestToChunklistQS = [
    'latency',
    'chunksLatency',
    'chunksNumber', 
    'fromEpochS', 
    'toEpochS', 
    'liveType'
];

class HTTPErrorData extends Error {
    constructor(code, message) {
        super(message);
        this._code = code;
    }

    get code() { return this._code; }
   
    toString() {
        return `${this._code}: ${super.message}`;
    }
}

// Entry point
exports.handler = async (event, context) => {
    // Update DDB configs
    const dbbConfigData = parseDDBConfig(process.env, dbbConfigDataDefault);
    const dbbChunksData = parseDDBChunks(process.env, dbbChunksDataDefault);

    const defaultParams = {
        latency: 20,// Deliver live edge - X secs (X = max transcoding chunk time)
        chunksLatency: 0, // Deliver live edge - X chunks
        chunksNumber: 3, // Deliver # chunks
        fromEpochS: -1,
        toEpochS: -1, // Not compatible with chunksNumber
        liveType: liveType.LIVE,
        manifestType: manifestType.NONE,
        renditionID: '',
        streamID: ''
    }

    const startMs = getTimeInMilliseconds();
    let streamID = '';
    
    logData(logType.INFO, 'Received event', '', 0, event);
    try {
        
        // Fetch config and return it
        const transcoderConfig = new LiveTranscoderConfig()
        await transcoderConfig.loadFromDDB(dbbConfigData.region, dbbConfigData.tableName, dbbConfigData.configName);
    
        logData(logType.INFO, 'Fetched config', '', getTimeInMilliseconds() - startMs, transcoderConfig.toString());

        const manifestConfig = getURLData(event, defaultParams);
        streamID = manifestConfig.streamID;
        logData(logType.INFO, 'Manifest config from URL', streamID, getTimeInMilliseconds() - startMs, manifestConfig);

        // Check if this is manifest or chunklist
        let maxAgeS = MAX_AGE_S_DEF;
        if (manifestConfig.manifestType === manifestType.MANIFEST) {
            res = createManifest(manifestConfig, transcoderConfig);
        }
        else if (manifestConfig.manifestType === manifestType.CHUNKLIST) {
            const chunks = await ddbGetChunks(dbbChunksData, manifestConfig);
            res = createChunklist(manifestConfig, transcoderConfig, chunks);
            maxAgeS = getTargetDurationMs(chunks) / (2 * 1000);
        }
        logData(logType.INFO, 'Response 200', streamID, getTimeInMilliseconds() - startMs, res);

        return response(context, 200, res, CONTENT_TYPE_M3U8, maxAgeS);
    }
    catch(e) {
        let errCode = 500;
        const errMsg = e.message;
        if (e instanceof HTTPErrorData) {
            errCode = e.code;
        }
        logData(logType.INFO, `Response ${errCode}`, streamID, getTimeInMilliseconds() - startMs, errMsg);

        return response(context, errCode, errMsg, CONTENT_TYPE_STR, MAX_AGE_S_DEF);
    }
}

function getTargetDurationMs(chunks) {
    let retMs = 10000;

    for (let n = 0; n < chunks.length; n++) {
        const chunk = chunks[n];
        if (chunk['target-duration-ms'] < retMs) {
            retMs = chunk['target-duration-ms'];
        }
    }
    return retMs;
}

function createManifest(manifestConfig, transcoderConfig) {
    const manifestLines = [];

    manifestLines.push('#EXTM3U');
    manifestLines.push('#EXT-X-VERSION:3');
    for (let n = 0; n < transcoderConfig.getParam('renditions').length; n++){
        const rendition = transcoderConfig.getParam('renditions')[n];
        manifestLines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${rendition.video_maxrate},RESOLUTION=${rendition.width}x${rendition.height}`);
        // Chunklist URL (relative)
        manifestLines.push(`${rendition.ID}/chunklist.m3u8?${createQSForChunklist(manifestConfig)}`);
    }
    return manifestLines.join("\n");
}

function createChunklist(manifestConfig, transcoderConfig, chunks) {
    const manifestLines = [];

    manifestLines.push('#EXTM3U');
    if (manifestConfig.liveType === liveType.EVENT) {
        manifestLines.push('#EXT-X-PLAYLIST-TYPE:EVENT');
    }
    manifestLines.push('#EXT-X-VERSION:3');
    const targetDurationMs = getTargetDurationMs(chunks);
    for (let n = chunks.length - 1; n >= 0; n--) {
        const chunk = chunks[n];
        // Is 1st one
        if (n === chunks.length - 1) {
            manifestLines.push(`#EXT-X-MEDIA-SEQUENCE:${chunk['seq-number']}`);
            manifestLines.push('#EXT-X-DISCONTINUITY-SEQUENCE:0');
            manifestLines.push(`#EXT-X-TARGETDURATION:${(targetDurationMs/1000).toFixed(0)}`);
            manifestLines.push("#EXT-X-INDEPENDENT-SEGMENTS");
        }
        manifestLines.push(`#EXTINF:${(chunk['duration-ms']/1000).toFixed(8)},`);
        manifestLines.push(new URL(chunk['file-path'], transcoderConfig.getParam('mediaCdnPrefix')).toString());
        // Is last one
        if ((n === 0) && (manifestConfig.liveType === liveType.VOD)) {
            manifestLines.push('#EXT-X-ENDLIST');
        }
    }
    return manifestLines.join("\n");
}

function response(context, code, body, contentType, maxAgeS) {
    const headers = {};
    let errorType = '';
    if (typeof(contentType) === 'string') {headers['Content-Type'] = contentType;}
    if (typeof(maxAgeS) === 'number') {headers['Cache-Control'] = `max-age=${Math.floor(maxAgeS).toString()}`};

    if ((code >= 400) && (code < 500)) {
        errorType =  'InvalidParameterException';
    } else if (code >= 500) {
        errorType =  'InternalServerError';
    }

    return {statusCode: code, errorType: errorType, requestId : context.awsRequestId, body: body, headers: headers, isBase64Encoded: false};
}

function checkPresentAndType(value, name, type, isEmptyConsideredFalse) {
    if ((name in value) && (typeof(value[name]) === type)) {
        if ((isEmptyConsideredFalse) && type === 'string' && (value[name] === "")) {
            return false;
        }
        return true;
    }
    return false;
}

function createQSForChunklist(manifestConfig) {
    const filteredQS = {};
    for (const [key, value] of Object.entries(manifestConfig)) {
        if (filterFromManifestToChunklistQS.includes(key)) {
            filteredQS[key] = value;
        }
    }  
    return querystring.stringify(filteredQS);
}

function getURLData(event, defaultConfig) {
    const ret = defaultConfig;
   
    if (!checkPresentAndType(event, 'pathParameters', 'object')) {
        throw new HTTPErrorData(400, 'No streamID or renditionID in the URL path');
    }
    if (checkPresentAndType(event.pathParameters, 'streamID', 'string')) {
        ret.streamID = event.pathParameters.streamID;
        ret.manifestType = manifestType.MANIFEST;
    }
    if (checkPresentAndType(event.pathParameters, 'renditionID', 'string')) {
        if (event.pathParameters.renditionID !== "") {
            ret.renditionID = event.pathParameters.renditionID;
            ret.manifestType = manifestType.CHUNKLIST;    
        }
    }
    if(ret.manifestType === manifestType.NONE) {
        throw new HTTPErrorData(400, 'Could not parse streamID or/and renditionID in the URL path');
    }

    if (checkPresentAndType(event, 'queryStringParameters', 'object')) {
        if (checkPresentAndType(event.queryStringParameters, 'liveType', 'string', true)) {
            if (Object.values(liveType).indexOf(event.queryStringParameters.liveType) < 0) {
                throw new HTTPErrorData(400, 'invalid liveType');
            }
            ret.liveType = event.queryStringParameters.liveType;
        }
        if (checkPresentAndType(event.queryStringParameters, 'chunksNumber', 'string', true)) {
            ret.chunksNumber = parseInt(event.queryStringParameters.chunksNumber);
        }
        // For VOD and event there we return all media
        if ((event.queryStringParameters.liveType === liveType.VOD) || (event.queryStringParameters.liveType === liveType.EVENT)) {
            ret.chunksNumber = -1;
        }

        // Load latency to provide chunklist
        // Check "latency", if not there use default
        if (checkPresentAndType(event.queryStringParameters, 'latency', 'string', true)) {
            ret.latency = parseInt(event.queryStringParameters.latency, 10);
        }
        else if (checkPresentAndType(event.queryStringParameters, 'chunksLatency', 'string', true)) {
            ret.chunksLatency = parseInt(event.queryStringParameters.chunksLatency, 10);
        }

        // Load from
        if (checkPresentAndType(event.queryStringParameters, 'fromEpochS', 'string', true)) {
            ret.fromEpochS = parseInt(event.queryStringParameters.fromEpochS, 10);
        }

        // Load to (only valid for VOD)
        if ((ret.liveType === liveType.VOD) && (checkPresentAndType(event.queryStringParameters, 'toEpochS', 'string', true))) {
            ret.toEpochS = parseInt(event.queryStringParameters.toEpochS, 10);
        }

        // Check from - to
        if ((ret.fromEpochS >= 0) && (ret.toEpochS >= 0) && (ret.toEpochS <= ret.fromEpochS)) {
            throw new HTTPErrorData(400, 'toEpochS can not be equal or lower than fromEpochS');
        }
    }
    return ret;
}

// Helpers

function parseDDBConfig(envVars, defaultDBBConfig) {
    ret = defaultDBBConfig;
    if ((typeof(envVars.AWS_REGION) === 'string') && (envVars.AWS_REGION != "")) {
        ret.region = envVars.AWS_REGION;
    }
    if ((typeof(envVars.DDB_CONFIG_TABLE_NAME) === 'string') && (envVars.DDB_CONFIG_TABLE_NAME != "")) {
        ret.tableName = envVars.DDB_CONFIG_TABLE_NAME;
    }

    console.log(`Dynamo table config data: ${JSON.stringify(ret)}`);

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

    console.log(`Dynamo table chunks data: ${JSON.stringify(ret)}`);

    return ret;
}

// DDB

async function ddbGetChunks(dbbChunksData, manifestConfig) {
    const ret = [];
    let limitChunksToGet = Number.MAX_SAFE_INTEGER;
    if (manifestConfig.chunksNumber > 0) {
        if (manifestConfig.chunksLatency > 0) {
            limitChunksToGet = manifestConfig.chunksNumber + manifestConfig.chunksLatency;
        }
        else {
            limitChunksToGet = manifestConfig.chunksNumber;
        }
    }

    const ddb = new aws.DynamoDB({region: dbbChunksData.region, maxRetries: DDB_MAX_RETRIES_DEF});
    // Query Item
    let wcStartEpochSStr = "0";
    let wcEndEpochSStr = "99999999999999999999999999999999999999";
    if (manifestConfig.fromEpochS > 0) {
        wcStartEpochSStr = Math.floor(manifestConfig.fromEpochS * 1000 * 1000 * 1000).toString(); // To ns
    }
    if (manifestConfig.toEpochS > 0) {
        wcEndEpochSStr = Math.floor(manifestConfig.toEpochS * 1000 * 1000 * 1000).toString(); // To ns
    } else if (manifestConfig.latency > 0) {
        const limitMs = Date.now() - (manifestConfig.latency * 1000);
        wcEndEpochSStr = Math.floor(limitMs * 1000 * 1000).toString(); // To ns
    }
    const params = {
        TableName: dbbChunksData.tableName,
        IndexName: "stream-id-wallclock-epoch-ns-index",
        KeyConditionExpression: "#streamid = :streamid and #wallclockepochns between :wallclockstart and :wallclockend",
        FilterExpression: '#renditionid = :renditionid',
        ExpressionAttributeNames:{
            "#streamid": "stream-id",
            "#wallclockepochns": "wallclock-epoch-ns",
            "#renditionid": "rendition-id",
        },
        ExpressionAttributeValues: {
            ":streamid": {S: manifestConfig.streamID},
            ":renditionid": {S: manifestConfig.renditionID},
            ":wallclockstart": {N: wcStartEpochSStr},
            ":wallclockend": {N: wcEndEpochSStr},
        },
        ScanIndexForward: false,
        Limit: limitChunksToGet
    };

    let moreData = false;
    do {
        moreData = false;
        const dbbData = await ddb.query(params).promise();
        for (let n = 0; n < dbbData.Items.length; n++) {
            ret.push(aws.DynamoDB.Converter.unmarshall(dbbData.Items[n]));
        }
        if (('LastEvaluatedKey' in dbbData) && (Object.keys(dbbData.LastEvaluatedKey).length > 0)) {
            params.ExclusiveStartKey = dbbData.LastEvaluatedKey;
            moreData = true;
        }
    } while ((moreData) && (ret.length < params.Limit));

    // Remove extra items from the oldest ones
    while (ret.length > limitChunksToGet) {
        ret.splice(-1,1);
    }
    // Remove extra items from the newest, since perhaps those are 
    if (manifestConfig.chunksLatency > 0) {
        let chunksToDel = manifestConfig.chunksLatency;
        while (chunksToDel > 0) {
            ret.shift();
            chunksToDel--;
        }    
    }
    return ret;
}

function getTimeInMilliseconds() {
    const hrTime = process.hrtime()
    return hrTime[0] * 1000 + hrTime[1] / 1000000;
}
