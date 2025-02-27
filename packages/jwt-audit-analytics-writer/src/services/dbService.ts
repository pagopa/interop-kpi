/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DB, IMain } from "pagopa-interop-kpi-commons";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";
import { clientAssertionRepository } from "../repositories/clientAssertion.repository.js";
import { generatedTokenRepository } from "../repositories/generatedToken.repository.js";

export function dbServiceBuilder(db: DB) {
  const pgp: IMain = db.$config.pgp;

  return {
    async insertRecordsToStaging(
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      await db.tx(async (t) => {
        await clientAssertionRepository(t).insert(pgp, records);
        await generatedTokenRepository(t).insert(pgp, records);
      });
    },

    async mergeStagingToTarget(): Promise<void> {
      await db.tx(async (t) => {
        await clientAssertionRepository(t).merge();
        await generatedTokenRepository(t).merge();
      });
    },

    async cleanStaging(): Promise<void> {
      await db.tx(async (t) => {
        await clientAssertionRepository(t).clean();
        await generatedTokenRepository(t).clean();
      });
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
