# Give EC2 RW permissions to your S3
This will allow your EC2 edge machine to write into your new S3 bucket

## Pre-requisite
You should allow your local AWS CLI user to perform some actions on your AWS resources

![Local user needed policies](/docs/pics/grant-local-user-IAM-access.png)

*Note: I recommend remove some of those policies after the inital set up (specially IAM full access policy). This is just an easy and unsafe way to avoid a permissions hassle*

# Actions
- Create an IAM role with S3 full access
```bash
./create-s3-full-access-for-ec2.sh
```
- Verify your edge machine is running and assign that created role to your Edge EC2 machine
```bash
# It will ask you for the instanceID of your edge machine, replace i-XXXXXXXX for the right InstanceID
./attach-role-to-ec2.sh i-XXXXXXXX
```
