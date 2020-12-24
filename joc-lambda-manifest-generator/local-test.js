const underTest = require('./index.js');

const testEvent = {
  "version":"2.0",
  "routeKey":"GET /video/{streamID}/{renditionID}",
  "rawPath":"/video/1/2",
  "rawQueryString":"name=jordi",
  "headers":{
     "accept":"*/*",
     "content-length":"0",
     "host":"hml7q7d334.execute-api.us-east-1.amazonaws.com",
     "user-agent":"curl/7.64.1",
     "x-amzn-trace-id":"Root=1-5fd73a35-193fdaa414ca9f0b4cf6c289",
     "x-forwarded-for":"83.51.200.53",
     "x-forwarded-port":"443",
     "x-forwarded-proto":"https"
  },
  "queryStringParameters":{
     "name":"jordi"
  },
  "requestContext":{
     "accountId":"957270781853",
     "apiId":"hml7q7d334",
     "domainName":"hml7q7d334.execute-api.us-east-1.amazonaws.com",
     "domainPrefix":"hml7q7d334",
     "http":{
        "method":"GET",
        "path":"/video/1/2",
        "protocol":"HTTP/1.1",
        "sourceIp":"83.51.200.53",
        "userAgent":"curl/7.64.1"
     },
     "requestId":"XiYIUgsMoAMEJXg=",
     "routeKey":"GET /video/{streamID}/{renditionID}",
     "stage":"$default",
     "time":"14/Dec/2020:10:11:01 +0000",
     "timeEpoch":1607940661123
  },
  "pathParameters":{
    "renditionID":"480p",
    "streamID":"20201224175505"
    //"streamID":"1"
  },
  "queryStringParameters": {
    "liveType": "vod",
    //"chunksLatency": "-1",
    //"chunksNumber": "1000"
  },
  "isBase64Encoded":false
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

