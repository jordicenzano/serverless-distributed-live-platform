/**
 * Created by Jordi Cenzano 2020/12/06
 */

const aws = require('aws-sdk');

// Example config object
/*
{
    "copyOriginalContentTypeToABRChunks": true,
    "copyOriginalMetadataToABRChunks": true,
    "overlayEncodingData": true,
    "overlayMessage": "Test-",
    "publicReadToABRChunks": true,
    "renditions": [
      {
        "height": 480,
        "ID": "480p",
        "video_buffersize": 4194304,
        "video_h264_level": "3.0",
        "video_h264_preset": "ultrafast",
        "video_h264_profile": "main",
        "video_maxrate": 2097152,
        "width": 854
      },
      {
        "height": 360,
        "ID": "360p",
        "video_buffersize": 2097152,
        "video_h264_level": "3.0",
        "video_h264_preset": "ultrafast",
        "video_h264_profile": "main",
        "video_maxrate": 1048576,
        "width": 640
      }
    ],
    "s3OutputPrefix": "output/"
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