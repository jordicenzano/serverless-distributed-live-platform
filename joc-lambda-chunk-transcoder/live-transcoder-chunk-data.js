/**
 * Created by Jordi Cenzano 2020/12/06
 */

const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

class ChunkData {
    constructor(s3Bucket, s3ObjKey, filePath, streamId, seqNumber, renditionId, wallClockEpochNs, targetDurationMs, durationMs) {
        this._uid = uuidv4();
        this._s3Bucket = s3Bucket;
        this._s3ObjKey = s3ObjKey;
        this._filePath = filePath;
        this._streamId = streamId;
        this._seqNumber = seqNumber;
        this._renditionId = renditionId;
        this._wallClockEpochNs = wallClockEpochNs;
        this._targetDurationMs = targetDurationMs;
        this._durationMs = durationMs;
    }

    get uid() { return this._uid; }
    get s3Bucket() { return this._s3Bucket; }
    get s3ObjKey() { return this._s3ObjKey; }
    get filePath() { return this._filePath; }
    get streamId() { return this._streamId; }
    get seqNumber() { return this._seqNumber; }
    get renditionId() { return this._renditionId; }
    get wallClockEpochNs() { return this._wallClockEpochNs; }
    get targetDurationMs() { return this._targetDurationMs; }
    get durationMs() { return this._durationMs; }
}

class LiveTranscoderChunkData {
    constructor() {
        this.DDB_MAX_RETRIES_DEF = 3;

        this.ddb = null;
        this.tableName = '';
        this.region = '';
    }

    setDDB(region, tableName) {
        this.region = region;
        this.tableName = tableName;
    }

    async saveChunk(chunkData) {
         // Create DDB object
         if (this.ddb === null) {
            this.ddb = new aws.DynamoDB({region: this.region, maxRetries: this.DDB_MAX_RETRIES_DEF});            
        }
        const params = {
            TableName: this.tableName,
            Item: {
                'uid' : {S: chunkData.uid},
                'stream-id' : {S: chunkData.streamId},
                's3bucket': {S: chunkData.s3Bucket},
                's3objkey': {S: chunkData.s3ObjKey},
                'file-path': {S: chunkData.filePath},
                'seq-number': {N: chunkData.seqNumber.toString()},
                'rendition-id': {S: chunkData.renditionId},
                'wallclock-epoch-ns': {N: chunkData.wallClockEpochNs.toString()},
                'first-video-ts': {N: '-1'},
                'first-audio-ts': {N: '-1'},
                'target-duration-ms': {N: chunkData.targetDurationMs.toString()},
                'duration-ms': {N: chunkData.durationMs.toString()}
            }
        };
        // Call DynamoDB to add the item to the table
        return await this.ddb.putItem(params).promise();
    }
}

module.exports = {LiveTranscoderChunkData, ChunkData};