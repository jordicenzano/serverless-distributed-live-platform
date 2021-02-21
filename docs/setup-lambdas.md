# Set up lambdas

- We need to create Lambda trancode, that means:
  - Create execution role
  - Create execution policies (permissions)
  - Attach permissions to role
  - Create lambda with env options
```bash
cd scripts
./create-trancode-lambda.sh   
```
  - Upload the code to the lambda
```bash
cd joc-lambda-chunk-transcoder/scripts
./upload-lambda.sh
```

- We need to create Lambda manifest, that means:
  - Create execution role
  - Create execution policies (permissions)
  - Attach permissions to role
  - Create lambda with env options
```bash
cd scripts
./create-manifest-lambda.sh
```
  - Upload the code to the lambda
```bash
cd joc-lambda-chunk-transcoder/scripts
./upload-lambda.sh
```

*Note: remember to modify [./scripts/base.sh](../scripts/base.sh) with the names and region you want*