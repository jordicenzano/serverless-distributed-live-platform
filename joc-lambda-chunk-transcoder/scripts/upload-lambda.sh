#!/usr/bin/env bash

# Import variables
source ../../scripts/base.sh

# exit when any command fails
set -e

#Create ZIP
cd ..
zip upload.zip -r *.js node_modules ffmpeg fonts  -x "ffmpeg/.*" -x "scripts/*" -x ".*" -x "node_modules/aws*"

#Populate lambda
aws --region ${AWS_REGION} lambda update-function-code --function-name ${LAMBDA_CHUNK_TRANSCODER_NAME} --zip-file fileb://upload.zip

#Remove zip
rm upload.zip

cd -