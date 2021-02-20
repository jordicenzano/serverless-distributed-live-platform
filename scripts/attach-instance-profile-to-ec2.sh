# Import variables
source base.sh

# exit when any command fails
set -e

if [ $# -lt 1 ]; then
	echo "Use ./attach-instance-profile-to-ec2.sh InstanceID\n"
    echo "InstanceID: InstanceID of the ec2 edge machine (example: i-0e8c876bb6f3cd69e)"
    echo "Example: ./attach-instance-profile-to-ec2.sh i-0e8c876bb6f3cd69e"
    exit 1
fi

# Instance ID
EC2_INSTANCE_ID=$1

echo "Attaching $IAM_INSTANCE_PROFILE_S3_FULL_ACCESS to $EC2_INSTANCE_ID"
aws $AWS_FLAGS --region $AWS_REGION ec2 associate-iam-instance-profile --instance-id $EC2_INSTANCE_ID --iam-instance-profile Name="$IAM_INSTANCE_PROFILE_S3_FULL_ACCESS"