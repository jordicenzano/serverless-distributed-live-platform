#!/usr/bin/env bash

# Import variables
source base.sh

# exit when any command fails
set -e

# Get arn of lambda manifest function
ARN_LAMBDA_MANIFEST=$(aws $AWS_FLAGS_TEXT --region $AWS_REGION lambda get-function --function-name $LAMBDA_MANIFEST_NAME --query 'Configuration.FunctionArn')

# Replacements
SOURCE_FILE_API="../config/live-rest-api-REPLACE.txt"
DEST_FILE_API="../config/live-rest-api.json"

sed -e "s/<<AWS-REGION>>/${AWS_REGION}/g" \
    -e "s/<<ARN-LAMBDA-MANIFEST>>/${ARN_LAMBDA_MANIFEST}/g" \
    -e "s/<<AWS-APIGATEWAY-NAME>>/${AWS_APIGATEWAY_NAME}/g" \
    $SOURCE_FILE_API > $DEST_FILE_API

# Create rest API by importing swagger definition
echo "Import swagger API definition to API Gateway on $AWS_REGION"
aws $AWS_FLAGS_JSON --cli-binary-format raw-in-base64-out --region $AWS_REGION apigateway import-rest-api --parameters "endpointConfigurationTypes=REGIONAL,basepath=ignore" --body file://$DEST_FILE_API

# Remove replaced file
rm $DEST_FILE_API

# Get API data
API_ID=$(aws $AWS_FLAGS_TEXT --region $AWS_REGION apigateway get-rest-apis --query "items[?name=='$AWS_APIGATEWAY_NAME'].id")
AWS_ACCOUNT_ID=$(aws $AWS_FLAGS_TEXT --region $AWS_REGION sts get-caller-identity --query 'Account')

# Grant permissions to API Gateway to call manifest lambda
echo "Grant permissions to API $AWS_APIGATEWAY_NAME (API: $API_ID, AWS ACC ID: $AWS_ACCOUNT_ID) to call manifest lambda"
aws $AWS_FLAGS_JSON --region $AWS_REGION lambda add-permission --function-name $LAMBDA_MANIFEST_NAME --statement-id apigateway-to-manifest --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$API_ID/*/GET/video/*/manifest.m3u8"
aws $AWS_FLAGS_JSON --region $AWS_REGION lambda add-permission --function-name $LAMBDA_MANIFEST_NAME --statement-id apigateway-to-chunklist --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$API_ID/*/GET/video/*/*/chunklist.m3u8"

# Deploy API & activate cache
echo "Deploying API $AWS_APIGATEWAY_NAME (API: $API_ID), to stage prod"
aws $AWS_FLAGS_JSON --region $AWS_REGION apigateway create-deployment --cache-cluster-enabled --cache-cluster-size 0.5 --rest-api-id $API_ID --stage-name prod

# Overwrite cache for chunklist
echo "Activate cache to 1s for $AWS_APIGATEWAY_NAME (API: $API_ID) in stage prod"
aws $AWS_FLAGS_JSON --region $AWS_REGION apigateway update-stage --rest-api-id $API_ID --stage-name prod --patch-operations "op=replace,path=/*/*/caching/ttlInSeconds,value=1"