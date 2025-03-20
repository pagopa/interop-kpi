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
        await generatedTokenRepo(db.conn).insert(t, db.pgp, records);
        await clientAssertionRepo(db.conn).insert(t, db.pgp, records);
      });
    },

    async mergeStagingToTarget(): Promise<void> {
      await db.conn.tx(async (t) => {
        await generatedTokenRepo(db.conn).merge(t);
        await clientAssertionRepo(db.conn).merge(t);
      });
    },

    async cleanStaging(): Promise<void> {
      await generatedTokenRepo(db.conn).clean();
      await clientAssertionRepo(db.conn).clean();
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
