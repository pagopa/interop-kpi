import { DbConfig, S3Config } from "pagopa-interop-kpi-commons";
import { GenericContainer } from "testcontainers";

export const TEST_POSTGRES_DB_PORT = 5432;
export const TEST_POSTGRES_DB_IMAGE = "postgres:14";

export const TEST_MINIO_PORT = 9000;
export const TEST_MINIO_IMAGE =
  "quay.io/minio/minio:RELEASE.2024-02-06T21-36-22Z";

/**
 * Starts a PostgreSQL container for testing purposes.
 *
 * @param config - The configuration for the PostgreSQL container.
 * @returns A promise that resolves to the started test container.
 */
export const postgreSQLContainer = (config: DbConfig): GenericContainer =>
  new GenericContainer(TEST_POSTGRES_DB_IMAGE)
    .withEnvironment({
      POSTGRES_DB: config.dbHost,
      POSTGRES_USER: config.dbUsername,
      POSTGRES_PASSWORD: config.dbPassword,
    })
    .withCopyFilesToContainer([
      {
        source: "../../docker/postgres/init-db.sql",
        target: "/docker-entrypoint-initdb.d/01-init.sql",
      },
    ])
    .withExposedPorts(TEST_POSTGRES_DB_PORT);

/**
 * Starts a MinIO container for testing purposes.
 *
 * @param config - The configuration for the MinIO container.
 * @returns A promise that resolves to the started test container.
 */
export const minioContainer = (config: S3Config): GenericContainer =>
  new GenericContainer(TEST_MINIO_IMAGE)
    .withEnvironment({
      MINIO_ROOT_USER: "testawskey",
      MINIO_ROOT_PASSWORD: "testawssecret",
      MINIO_SITE_REGION: "eu-south-1",
    })
    .withEntrypoint(["sh", "-c"])
    .withCommand([
      `mkdir -p /data/${config.s3Bucket} &&
       mkdir -p /data/test-bucket-1 &&
       mkdir -p /data/test-bucket-2 &&
       /usr/bin/minio server /data`,
    ])
    .withExposedPorts(TEST_MINIO_PORT);
