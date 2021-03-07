#!/usr/bin/env bash

# Import variables
source base.sh

# exit when any command fails
set -e

echo "Getting CDN dist ARN from tag (Name)"
CF_DIST_ARN=$(aws $AWS_FLAGS_TEXT resourcegroupstaggingapi get-resources --tag-filters Key=Name,Values=joc-live-dist-transcoder-cloudfront-media --query 'ResourceTagMappingList[0].ResourceARN')

# Get item after last /
CF_ID=${CF_DIST_ARN##*/}

echo "Getting CDN domain name for ID: $CF_ID (Arn: $CF_DIST_ARN)"
MEDIA_CDN_DOMAIN_NAME=$(aws $AWS_FLAGS_TEXT cloudfront get-distribution --id $CF_ID --query 'Distribution.DomainName')

# Replacements
SOURCE_FILE_CONFIG="../config/system-config-5renditions-1080p-REPLACE.txt"
DEST_FILE_CONFIG="../config/system-config-5renditions-1080p.json"

sed -e "s/<<MEDIA-CDN-DOMAIN-NAME>>/${MEDIA_CDN_DOMAIN_NAME}/g" $SOURCE_FILE_CONFIG > $DEST_FILE_CONFIG

echo "Populate DDB with configs value"
aws $AWS_FLAGS_JSON --region $AWS_REGION dynamodb put-item --table-name $DDB_CONFIG_TABLE_NAME --item file://$DEST_FILE_CONFIG

# Remove replaced file
rm $DEST_FILE_CONFIG
