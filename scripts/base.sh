#!/usr/bin/env bash

# Variables used to create AWS env
AWS_REGION="eu-west-3" # Paris
BASE_NAME="joc-live-dist-transcoder"
S3_BUCKET_NAME="$BASE_NAME-bucket-media"

IAM_EC2_ROLE_S3_FULL_ACCESS="$BASE_NAME-ec2-role-s3-full-access"
IAM_POLICY_S3_FULL_ACCESS="$BASE_NAME-policy-s3-full-access"
IAM_POLICY_DDB_FULL_ACCESS="$BASE_NAME-policy-ddb-full-access"
IAM_POLICY_DDB_READ_ACCESS="$BASE_NAME-policy-ddb-read-access"
IAM_POLICY_LAMBDA_LOGS="$BASE_NAME-policy-cloudwatch-logs"
IAM_INSTANCE_PROFILE_S3_FULL_ACCESS="$BASE_NAME-instance-profile-s3-full-access"

DDB_CONFIG_TABLE_NAME="$BASE_NAME-ddb-configs"
DDB_CONFIG_TABLE_CHUNKS="$BASE_NAME-ddb-chunks"

IAM_LAMBDA_ROLE_CHUNK_TRANSCODER="$BASE_NAME-role-lambda-chunk-transcoder"
LAMBDA_CHUNK_TRANSCODER_NAME="$BASE_NAME-lambda-chunk-transcoder"
IAM_LAMBDA_ROLE_MANIFEST="$BASE_NAME-role-lambda-manifest"
LAMBDA_MANIFEST_NAME="$BASE_NAME-lambda-manifest"

CLOUDFRONT_DISTRIBUTION_NAME="$BASE_NAME-cloudfront-media"
CLOUDFRONT_ORIGIN_SHIELD_REGION="eu-west-2" # London (Not all regions are available for origin shield)

# AWS default input flabs
AWS_FLAGS="--no-cli-pager --no-cli-auto-prompt"
AWS_FLAGS_JSON="$AWS_FLAGS --output json"
AWS_FLAGS_TEXT="$AWS_FLAGS --output text"
