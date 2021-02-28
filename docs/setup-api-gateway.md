# Set API Gateway

- We need to create the API gateway and connect the entry points with manifest lambda
  - Create API gateway via OpenAPI definition
  - Grant permissions to API Gateway to execute lambda manifest (get Manifest and get Chunklist)
  - Create `prod` stage and deploy the API there
  - Activate cache in `prod` stage
```bash
cd scripts
./create-rest-api.sh
```

*Note: remember to modify [./scripts/base.sh](../scripts/base.sh) with the names and region you want*