const underTest = require('./index.js');

const testEvent = {
  Records: [{
      "eventVersion": "2.0",
      "eventSource": "aws:s3",
      "awsRegion": "us-east-1",
      "eventTime": "1970-01-01T00:00:00.000Z",
      "eventName": "ObjectCreated:Put",
      "userIdentity": {
        "principalId": "EXAMPLE"
      },
      "requestParameters": {
        "sourceIPAddress": "127.0.0.1"
      },
      "responseElements": {
        "x-amz-request-id": "EXAMPLE123456789",
        "x-amz-id-2": "EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH"
      },
      "s3": {
        "s3SchemaVersion": "1.0",
        "configurationId": "testConfigRule",
        "bucket": {
          "name": "live-dist-test",
          "ownerIdentity": {
            "principalId": "EXAMPLE"
          },
          "arn": "arn:aws:s3:::live-dist-test"
        },
        "object": {
          "key": "test/streamID/source_00000.ts",
          "size": 330000,
          "eTag": "0123456789abcdef0123456789abcdef",
          "sequencer": "0A1B2C3D4E5F678901"
        }
      }
    }]
};

const context = {
    isLocalDebug: true,
    testFfmpeg: false
};

async function main() {
    console.log('[LOCAL] Start')
    const ret = await underTest.handler(testEvent, context);
    console.log('[LOCAL] end. Ret: ' + JSON.stringify(ret));
}

main();

