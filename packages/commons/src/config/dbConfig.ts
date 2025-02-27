import { z } from "zod";

export const DbConfig = z
  .object({
    DB_HOST: z.string(),
    DB_NAME: z.string(),
    DB_USERNAME: z.string(),
    DB_PASSWORD: z.string(),
    DB_PORT: z.coerce.number().min(1001),
    DB_SCHEMA_NAME: z.string(),
    DB_USE_SSL: z
      .enum(["true", "false"])
      .transform((value) => value === "true"),
    MAX_CONNECTION_POOL: z.coerce.number().default(10),
  })
  .transform((c) => ({
    dbHost: c.DB_HOST,
    dbName: c.DB_NAME,
    dbUsername: c.DB_USERNAME,
    dbPassword: c.DB_PASSWORD,
    dbPort: c.DB_PORT,
    dbSchemaName: c.DB_SCHEMA_NAME,
    dbUseSSL: c.DB_USE_SSL,
    maxConnectionPool: c.MAX_CONNECTION_POOL,
  }));

export type DbConfig = z.infer<typeof DbConfig>;
