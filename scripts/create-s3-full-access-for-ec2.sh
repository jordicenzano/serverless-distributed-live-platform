#!/usr/bin/env bash

# Import variables
source base.sh

# exit when any command fails
set -e

# Create role
echo "Creating role $IAM_EC2_ROLE_S3_FULL_ACCESS in $AWS_REGION"
aws $AWS_FLAGS_JSON --region $AWS_REGION iam create-role --role-name $IAM_EC2_ROLE_S3_FULL_ACCESS --assume-role-policy-document file://../config/ec2-role-trust-policy.json

# Add policy to role
echo "Adding policy $IAM_POLICY_S3_FULL_ACCESS to role $IAM_EC2_ROLE_S3_FULL_ACCESS"
aws $AWS_FLAGS_JSON --region $AWS_REGION iam put-role-policy --role-name $IAM_EC2_ROLE_S3_FULL_ACCESS --policy-name $IAM_POLICY_S3_FULL_ACCESS --policy-document file://../config/s3-full-access-policy.json

# Create instance profile
echo "Creating instance profile $IAM_INSTANCE_PROFILE_S3_FULL_ACCESS"
aws $AWS_FLAGS_JSON --region $AWS_REGION iam create-instance-profile --instance-profile-name $IAM_INSTANCE_PROFILE_S3_FULL_ACCESS

# Attaching role to instance profile
echo "Attaching role $IAM_EC2_ROLE_S3_FULL_ACCESS to instance profile $IAM_INSTANCE_PROFILE_S3_FULL_ACCESS"
aws $AWS_FLAGS_JSON --region $AWS_REGION iam add-role-to-instance-profile --instance-profile-name $IAM_INSTANCE_PROFILE_S3_FULL_ACCESS --role-name $IAM_EC2_ROLE_S3_FULL_ACCESS