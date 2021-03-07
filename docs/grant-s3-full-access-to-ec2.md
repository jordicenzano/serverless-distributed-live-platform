# Grant EC2 edge full access to your S3
Your EC2 edge machine need to upload (write) chunks to S3, so it needs write rights. To allow that:

- Create an IAM role with S3 full access
```bash
./create-s3-full-access-for-ec2.sh
```
- Verify your edge machine is running and assign that created role to your Edge EC2 machine
```bash
# It will ask you for the instanceID of your edge machine, replace i-XXXXXXXX for the right InstanceID
./attach-role-to-ec2.sh i-XXXXXXXX
```
