#!/usr/bin/env bash

# Import variables
source base.sh

# exit when any command fails
set -e

# Get API data
API_ID=$(aws $AWS_FLAGS_TEXT --region $AWS_REGION apigateway get-rest-apis --query "items[?name=='$AWS_APIGATEWAY_NAME'].id")

# Get api prepend from prod and add /video
echo "The API CDN prepend is: https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod/video"