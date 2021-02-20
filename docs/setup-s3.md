# Set up S3 bucket

- Create S3 bucket (if it does not exists)
- (Optional) Add a lifecycle expiration policy to avoid monotonically increasing costs

You can do that by executing:
```bash
cd scripts
./create-s3-bucket.sh
```

*Note: remember to modify [./scripts/base.sh](../scripts/base.sh) with the names and region you want*