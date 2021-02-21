#!/usr/bin/env bash

# Import variables
source base.sh

# exit when any command fails
set -e

# Create role
echo "Creating role $IAM_LAMBDA_ROLE_MANIFEST in $AWS_REGION"
aws $AWS_FLAGS_JSON --region $AWS_REGION iam create-role --role-name $IAM_LAMBDA_ROLE_MANIFEST --assume-role-policy-document file://../config/lambda-role-trust-policy.json

# Add policies to role
echo "Adding policy $IAM_POLICY_DDB_READ_ACCESS to role $IAM_LAMBDA_ROLE_MANIFEST"
aws $AWS_FLAGS_JSON --region $AWS_REGION iam put-role-policy --role-name $IAM_LAMBDA_ROLE_MANIFEST --policy-name $IAM_POLICY_DDB_READ_ACCESS --policy-document file://../config/ddb-read-access-policy.json

echo "Adding policy $IAM_POLICY_LAMBDA_LOGS to role $IAM_LAMBDA_ROLE_MANIFEST"
aws $AWS_FLAGS_JSON --region $AWS_REGION iam put-role-policy --role-name $IAM_LAMBDA_ROLE_MANIFEST --policy-name $IAM_POLICY_LAMBDA_LOGS --policy-document file://../config/cloudwatch-lambda-policy.json

# Get role ARN
ARN_IAM_LAMBDA_ROLE_MANIFEST=$(aws $AWS_FLAGS_TEXT iam get-role --role-name $IAM_LAMBDA_ROLE_MANIFEST --query 'Role.Arn')

echo "Creating lambda $LAMBDA_MANIFEST_NAME (ARN: $ARN_IAM_LAMBDA_ROLE_MANIFEST) pointing it to DDB ($DDB_CONFIG_TABLE_NAME, $DDB_CONFIG_TABLE_CHUNKS)"
aws $AWS_FLAGS_JSON --region $AWS_REGION lambda create-function --function-name $LAMBDA_MANIFEST_NAME --runtime nodejs12.x --handler index.handler --timeout 180 --memory-size 10240 --role $ARN_IAM_LAMBDA_ROLE_MANIFEST --zip-file "fileb://emptyLambda/index.zip" --environment "Variables={DDB_CONFIG_TABLE_NAME=$DDB_CONFIG_TABLE_NAME,DDB_CONFIG_TABLE_CHUNKS=$DDB_CONFIG_TABLE_CHUNKS}"
