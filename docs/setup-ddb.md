# Set up Dynamo DB

- Create table for configurations
- Create table for chunks metadata with its GSI (used by manifest creation)

You can do that by executing:
```bash
cd scripts
./create-ddb.sh
```

*Note: remember to modify [./scripts/base.sh](../scripts/base.sh) with the names and region you want*