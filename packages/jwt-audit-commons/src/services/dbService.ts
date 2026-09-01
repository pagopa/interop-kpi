/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  DBContext,
  IMain,
  ITask,
} from "pagopa-interop-kpi-commons";

export interface JwtAuditRepository<T> {
  readonly copyFromS3ToStaging: (s3ObjectKey: string) => Promise<void>;
  readonly insert: (
    t: ITask<unknown>,
    pgp: IMain,
    records: T[]
  ) => Promise<void>;
  readonly merge: (t: ITask<unknown>) => Promise<void>;
  readonly deduplicate: (t: ITask<unknown>) => Promise<void>;
  readonly clean: () => Promise<void>;
}

export type JwtAuditRepositoryBuilder<T> = (
  conn: DBConnection
) => JwtAuditRepository<T>;

export function jwtAuditDbServiceBuilder<T>(
  db: DBContext,
  dpopRepo: JwtAuditRepositoryBuilder<T>,
  clientAssertionRepo: JwtAuditRepositoryBuilder<T>,
  generatedTokenRepo: JwtAuditRepositoryBuilder<T>
) {
  return {
    async copyRecordsToStaging(source: {
      generatedTokenPath: string;
      clientAssertionPath: string;
      dpopPath: string;
    }): Promise<void> {
      await generatedTokenRepo(db.conn).copyFromS3ToStaging(
        source.generatedTokenPath
      );
      await clientAssertionRepo(db.conn).copyFromS3ToStaging(
        source.clientAssertionPath
      );
      await dpopRepo(db.conn).copyFromS3ToStaging(source.dpopPath);
    },

    async insertRecordsToStaging(records: T[]): Promise<void> {
      await db.conn.tx(async (t) => {
        await generatedTokenRepo(db.conn).insert(t, db.pgp, records);
        await clientAssertionRepo(db.conn).insert(t, db.pgp, records);
        await dpopRepo(db.conn).insert(t, db.pgp, records);
      });
    },

    async mergeStagingToTarget(): Promise<void> {
      await db.conn.tx(async (t) => {
        await generatedTokenRepo(db.conn).merge(t);
        await clientAssertionRepo(db.conn).merge(t);
        await dpopRepo(db.conn).merge(t);
      });
    },

    async deduplicateStaging(): Promise<void> {
      await db.conn.tx(async (t) => {
        await generatedTokenRepo(db.conn).deduplicate(t);
        await clientAssertionRepo(db.conn).deduplicate(t);
        await dpopRepo(db.conn).deduplicate(t);
      });
    },

    async cleanStaging(): Promise<void> {
      await generatedTokenRepo(db.conn).clean();
      await clientAssertionRepo(db.conn).clean();
      await dpopRepo(db.conn).clean();
    },
  };
}

export type JwtAuditDBService<T> = ReturnType<
  typeof jwtAuditDbServiceBuilder<T>
>;
