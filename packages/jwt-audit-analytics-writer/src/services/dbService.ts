/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DBContext } from "pagopa-interop-kpi-commons";
import { clientAssertionRepository } from "../repositories/clientAssertion.repository.js";
import { generatedTokenRepository } from "../repositories/generatedToken.repository.js";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";
import { dpopRepository } from "../repositories/dpop.repository.js";

export function dbServiceBuilder(
  db: DBContext,
  dpopRepo = dpopRepository,
  clientAssertionRepo = clientAssertionRepository,
  generatedTokenRepo = generatedTokenRepository
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

    async insertRecordsToStaging(
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
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

export type DBService = ReturnType<typeof dbServiceBuilder>;
