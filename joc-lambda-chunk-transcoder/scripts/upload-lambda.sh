#!/usr/bin/env bash

LAMBDA_REGION="us-east-1"
LAMBDA_NAME="joc-lambda-chunk-transcoder"

#Create ZIP
cd ..
zip upload.zip -r *.js node_modules ffmpeg fonts  -x "ffmpeg/.*" -x "scripts/*" -x ".*" -x "node_modules/aws*"

#Populate lambda
aws --region ${LAMBDA_REGION} lambda update-function-code --function-name ${LAMBDA_NAME} --zip-file fileb://upload.zip

#Remove zip
rm upload.zip

cd -