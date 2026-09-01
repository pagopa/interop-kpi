# m2m-jwt-audit-analytics-writer

This package processes S3 notification messages to retrieve files containing M2M JWT audit data. It parses the logs and stores the data, supporting the Interop KPI system as part of the M2M JWT audit ingestion pipeline.

## Local infrastructure

Start the shared infrastructure from the repository root:

```bash
docker compose --file docker/docker-compose.yml up -d postgres minio elasticmq
```

The PostgreSQL initialization script creates the three M2M audit tables, while ElasticMQ creates the `m2m-jwt-audit-analytics` queue.

Create the MinIO buckets used by the writer if they do not exist yet:

```bash
AWS_ACCESS_KEY_ID=testawskey AWS_SECRET_ACCESS_KEY=testawssecret \
  aws --endpoint-url http://localhost:9000 s3 mb \
  s3://interop-m2m-jwt-audit-analytics-bucket

AWS_ACCESS_KEY_ID=testawskey AWS_SECRET_ACCESS_KEY=testawssecret \
  aws --endpoint-url http://localhost:9000 s3 mb \
  s3://interop-m2m-jwt-audit-analytics-copy-bucket
```

Then run the writer from the repository root:

```bash
pnpm start:m2m-jwt-audit-analytics-writer
```

When running integration tests with Rancher Desktop, point Testcontainers to its socket and disable Ryuk:

```bash
DOCKER_HOST=unix://${HOME}/.rd/docker.sock \
  TESTCONTAINERS_RYUK_DISABLED=true \
  pnpm --filter pagopa-m2m-jwt-audit-analytics-writer test -- --run
```
