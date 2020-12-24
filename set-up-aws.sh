#!/usr/bin/env bash

AWS_REGION="us-east-1"
BASE_NAME="joc-live-transcoder"
S3_BUCKET_NAME="$BASE_NAME-bucket-media"
LAMBDA_CHUNK_TRANSCODER_NAME="$BASE_NAME-lambda-chunk-transcoder"
LAMBDA_MANIFEST_NAME="$BASE_NAME-lambda-manifest"

# Actually create the bucket (with expiration)
aws s3 mb "s3://${S3_BUCKET}"

# Create transcoding lambda
# Create transcoding lambda role

# Create trigger that connects transcoding lambda to upload S3 (careful recursion!)

# Create DynamoDB config table
# Populate it

# Create DynamoDB ABR table
# Populate it

# Create manifest service lambda
# Create manifest service lambda role

# Create HTTP function & connect with lambda

# TODO: Create CDN in front of S3 + HTTP lambda following expiration headers
