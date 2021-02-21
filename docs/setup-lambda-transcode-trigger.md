# Set up trigger for lambda transcode

- Every time a new file is uploaded (at the end) to `/ingest` in our S3 media bucket execute a transcode lambda. **Be careful with filters, if not you will create a very expensive infinite loop**

You can do that by executing:
```bash
cd scripts
./create-transcode-trigger.sh
```

*Note: remember to modify [./scripts/base.sh](../scripts/base.sh) with the names and region you want*