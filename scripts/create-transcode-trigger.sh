#!/usr/bin/env bash

# Import variables
source base.sh

# exit when any command fails
set -e

# Create role
echo "Adding permission to S3 ($S3_BUCKET_NAME) to invoke $LAMBDA_CHUNK_TRANSCODER_NAME lambda"
aws $AWS_FLAGS_JSON --region $AWS_REGION lambda add-permission --function-name $LAMBDA_CHUNK_TRANSCODER_NAME --principal s3.amazonaws.com --statement-id s3invoke --action "lambda:InvokeFunction" --source-arn arn:aws:s3:::$S3_BUCKET_NAME

ARN_LAMBDA_CHUNK_TRANSCODER=$(aws $AWS_FLAGS_TEXT --region $AWS_REGION lambda get-function --function-name $LAMBDA_CHUNK_TRANSCODER_NAME --query 'Configuration.FunctionArn')

SOURCE_FILE_TRIGGER="../config/s3-lambda-trigger-REPLACE.txt"
DEST_FILE_TRIGGER="../config/s3-lambda-trigger.json"
sed "s/<<ARN-LAMBDA-CHUNK-TRANSCODER>>/${ARN_LAMBDA_CHUNK_TRANSCODER}/g" $SOURCE_FILE_TRIGGER > $DEST_FILE_TRIGGER

echo "Creating file $DEST_FILE_TRIGGER from $SOURCE_FILE_TRIGGER (ARN: $ARN_LAMBDA_CHUNK_TRANSCODER)"
aws $AWS_FLAGS_JSON --region $AWS_REGION s3api put-bucket-notification-configuration --bucket $S3_BUCKET_NAME --notification-configuration file://$DEST_FILE_TRIGGER

# Remove replaced file
rm $DEST_FILE_TRIGGER