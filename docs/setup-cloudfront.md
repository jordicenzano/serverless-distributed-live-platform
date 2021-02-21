# Set Cloudfront as media CDN

- Create CloudFront global CDN layer on top of S3
- 
You can do that by executing:
```bash
cd scripts
./create-cloudfront.sh
```

*Note: remember to modify [./scripts/base.sh](../scripts/base.sh) with the names and region you want*