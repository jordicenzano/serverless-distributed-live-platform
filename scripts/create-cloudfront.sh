#!/usr/bin/env bash

# Import variables
source base.sh

# exit when any command fails
set -e

# Create Cloudfront access identity to allow only access throght CF
echo "Creating Cloudfront access identity"
CF_ORIGIN_ACCESS_IDENTITY=$(aws $AWS_FLAGS_TEXT cloudfront create-cloud-front-origin-access-identity --cloud-front-origin-access-identity-config 'CallerReference="20210221213400",Comment="Access to media through CF"' --query 'CloudFrontOriginAccessIdentity.Id')
CF_ORIGIN_ACCESS_IDENTITY="E2PQ68KDZXVE8J"

# Create HLS + QS cache policy
CF_HLS_QS_CACHE_POLICY_ID=$(aws $AWS_FLAGS_TEXT cloudfront create-cache-policy --cache-policy-config file://../config/cloudfront-cache-policy.json --query 'CachePolicy.Id')

# Create CORS request policy
CF_ORIGIN_REQUEST_POLICY_ID=$(aws $AWS_FLAGS_TEXT cloudfront create-origin-request-policy --origin-request-policy-config file://../config/cloudfront-origin-request-policy.json --query 'OriginRequestPolicy.Id')

# Replacements
SOURCE_FILE_DIST="../config/cloudfront-REPLACE.txt"
DEST_FILE_DIST="../config/cloudfront.json"

sed -e "s/<<CLOUDFRONT-DISTRIBUTION-NAME>>/${CLOUDFRONT_DISTRIBUTION_NAME}/g" \
    -e "s/<<CF-ORIGIN-ACCESS-IDENTITY>>/${CF_ORIGIN_ACCESS_IDENTITY}/g" \
    -e "s/<<S3-BUCKET-NAME>>/${S3_BUCKET_NAME}/g" \
    -e "s/<<CF-ORIGIN-SHIELD-REGION>>/${CLOUDFRONT_ORIGIN_SHIELD_REGION}/g" \
    -e "s/<<CF-HLS-CACHE-POLICY-ID>>/${CF_HLS_QS_CACHE_POLICY_ID}/g" \
    -e "s/<<CF-ORIGIN-REQUEST-POLICY-ID>>/${CF_ORIGIN_REQUEST_POLICY_ID}/g" \
    $SOURCE_FILE_DIST > $DEST_FILE_DIST

# Create cloudfront dist
echo "Creating Cloudfront distribuition $CLOUDFRONT_DISTRIBUTION_NAME (with origin access identity: $CF_ORIGIN_ACCESS_IDENTITY, Cache policy ID: $CF_HLS_QS_CACHE_POLICY_ID, Req polixy ID: $CF_ORIGIN_REQUEST_POLICY_ID)"
aws $AWS_FLAGS_JSON cloudfront create-distribution-with-tags --distribution-config file://$DEST_FILE_DIST

# Remove replaced file
rm $DEST_FILE_DIST
