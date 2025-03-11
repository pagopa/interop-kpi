/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DBContext } from "pagopa-interop-kpi-commons";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";
import { clientAssertionRepository } from "../repositories/clientAssertion.repository.js";
import { generatedTokenRepository } from "../repositories/generatedToken.repository.js";

export function dbServiceBuilder(
  db: DBContext,
  clientAssertionRepo = clientAssertionRepository,
  generatedTokenRepo = generatedTokenRepository
) {
  return {
    async insertRecordsToStaging(
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      await db.conn.tx(async (t) => {
        await clientAssertionRepo(db.conn).insert(t, db.pgp, records);
        await generatedTokenRepo(db.conn).insert(t, db.pgp, records);
      });
    },

    async mergeStagingToTarget(): Promise<void> {
      await db.conn.tx(async (t) => {
        await clientAssertionRepo(db.conn).merge(t);
        await generatedTokenRepo(db.conn).merge(t);
      });
    },

    async cleanStaging(): Promise<void> {
      await clientAssertionRepo(db.conn).clean();
      await generatedTokenRepo(db.conn).clean();
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
