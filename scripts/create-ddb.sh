#!/usr/bin/env bash

# Import variables
source base.sh

# exit when any command fails
set -e

echo "Creating table $DDB_CONFIG_TABLE_NAME"
aws $AWS_FLAGS_JSON --region $AWS_REGION dynamodb create-table --table-name $DDB_CONFIG_TABLE_NAME --attribute-definitions AttributeName=config-name,AttributeType=S --key-schema AttributeName=config-name,KeyType=HASH --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

echo "Creating table $DDB_CONFIG_TABLE_CHUNKS with GSI"
aws $AWS_FLAGS_JSON --region $AWS_REGION dynamodb create-table --table-name $DDB_CONFIG_TABLE_CHUNKS --attribute-definitions AttributeName=stream-id,AttributeType=S AttributeName=uid,AttributeType=S AttributeName=wallclock-epoch-ns,AttributeType=N --key-schema AttributeName=uid,KeyType=HASH AttributeName=stream-id,KeyType=RANGE --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 --global-secondary-indexes "[{\"IndexName\": \"stream-id-wallclock-epoch-ns-index\", \"KeySchema\": [{\"AttributeName\": \"stream-id\", \"KeyType\": \"HASH\"}, {\"AttributeName\": \"wallclock-epoch-ns\", \"KeyType\": \"RANGE\"}], \"Projection\": {\"ProjectionType\": \"ALL\"}, \"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}}]"