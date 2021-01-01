/**
 * Created by Jordi Cenzano 2020/12/06
 */

const aws = require('aws-sdk');

// Example config object
/*
{
  "config-name": "default",
  "desc": "1080p (Premium 6 renditions)",
  "value": {
    "copyOriginalContentTypeToABRChunks": true,
    "copyOriginalMetadataToABRChunks": true,
    "mediaCdnPrefix": "https://XXXXXXXXXXXXXX.cloudfront.net",
    "overlayEncodingData": true,
    "overlayMessage": "Test-",
    "publicReadToABRChunks": false,
    "renditions": [
      {
        "height": 1080,
        "ID": "1080p",
        "video_buffersize": 7000000,
        "video_crf": 23,
        "video_h264_bpyramid": "strict",
        "video_h264_preset": "slow",
        "video_h264_profile": "high",
        "video_maxrate": 3500000,
        "width": 1920
      },
      {
        "height": 144,
        "ID": "144p",
        "video_buffersize": 200000,
        "video_crf": 23,
        "video_h264_bpyramid": "strict",
        "video_h264_preset": "slow",
        "video_h264_profile": "high",
        "video_maxrate": 100000,
        "video_pix_fmt": "yuv420p",
        "width": 256
      }
    ],
    "s3OutputPrefix": "output/",
    "video_pix_fmt": "yuv420p"
  }
}
*/

class LiveTranscoderConfig {
    constructor() {
        this.DDB_MAX_RETRIES_DEF = 3;

        this.loaded = false;
        this.config = {};
        this.ddb = null;
    }

    async loadFromDDB(region, tableName, configName) {
        // Create DDB object
        if (this.ddb === null) {
            this.ddb = new aws.DynamoDB({region: region, maxRetries: this.DDB_MAX_RETRIES_DEF});
        }

        // Read Item
        const params = {
            Key: {"config-name": {S: configName}},
            TableName: tableName
        };
        const dbbData =  await this.ddb.getItem(params).promise();
        this.config = aws.DynamoDB.Converter.unmarshall(dbbData.Item).value;
        this.loaded = true;

        return this.loaded;
    }

    // Get data
    getParam(name) {
        return this.checkIntegrityAndReturn(name);
    }
    getParamDefault(name, defaultValue) {
        try {
            return this.checkIntegrityAndReturn(name);
        }
        catch(e) {
            return defaultValue;
        }
    }

    toString() {
        return JSON.stringify(this.config);
    }

    checkIntegrityAndReturn(name) {
        if (!this.loaded) {
            throw new Error (`Tried to access to a non loaded transcoding config`);
        }
        if (!(name in this.config)) {
            throw new Error (`Property ${name} not found in transcoding config`);
        }
        return this.config[name];
    }
}

module.exports = LiveTranscoderConfig;