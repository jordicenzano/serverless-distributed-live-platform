#!/usr/bin/env bash

# Variables used to create AWS env
AWS_REGION="eu-west-3" # Paris
BASE_NAME="joc-live-dist-transcoder"
S3_BUCKET_NAME="$BASE_NAME-bucket-media"

IAM_EC2_ROLE_S3_FULL_ACCESS="$BASE_NAME-ec2-role-s3-full-access"
IAM_POLICY_S3_FULL_ACCESS="$BASE_NAME-policy-s3-full-access"
IAM_INSTANCE_PROFILE_S3_FULL_ACCESS="$BASE_NAME-instance-profile-s3-full-access"
LAMBDA_CHUNK_TRANSCODER_NAME="$BASE_NAME-lambda-chunk-transcoder"
LAMBDA_MANIFEST_NAME="$BASE_NAME-lambda-manifest"

# AWS default input flabs
AWS_FLAGS="--no-cli-pager --no-cli-auto-prompt --output json"
