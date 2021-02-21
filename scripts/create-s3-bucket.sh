#!/usr/bin/env bash

# Import variables
source base.sh

# exit when any command fails
set -e

# Check if bucket exists
if aws $AWS_FLAGS_JSON s3api head-bucket --bucket "$S3_BUCKET_NAME" >/dev/null; then
    echo "Skipping creation, bucket $S3_BUCKET_NAME already exists"
else
    echo "Creating S3 bucket $S3_BUCKET_NAME in $AWS_REGION"
    aws $AWS_FLAGS_JSON --region $AWS_REGION s3 mb "s3://$S3_BUCKET_NAME" --region $AWS_REGION
fi

echo "Setting S3 bucket lifecycle"
aws $AWS_FLAGS_JSON --region $AWS_REGION s3api put-bucket-lifecycle-configuration --bucket $S3_BUCKET_NAME --lifecycle-configuration file://s3-lifecycle.json 