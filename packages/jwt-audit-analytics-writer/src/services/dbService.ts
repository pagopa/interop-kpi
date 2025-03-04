/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DB, IMain } from "pagopa-interop-kpi-commons";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";
import { clientAssertionRepository } from "../repositories/clientAssertion.repository.js";
import { generatedTokenRepository } from "../repositories/generatedToken.repository.js";

export function dbServiceBuilder(
  db: DB,
  clientAssertionRepo = clientAssertionRepository,
  generatedTokenRepo = generatedTokenRepository
) {
  const pgp: IMain = db.$config.pgp;

  return {
    async insertRecordsToStaging(
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      await db.tx(async (t) => {
        await clientAssertionRepo(t).insert(pgp, records);
        await generatedTokenRepo(t).insert(pgp, records);
      });
    },

    async mergeStagingToTarget(): Promise<void> {
      await db.tx(async (t) => {
        await clientAssertionRepo(t).merge();
        await generatedTokenRepo(t).merge();
      });
    },

    async cleanStaging(): Promise<void> {
      await db.tx(async (t) => {
        await clientAssertionRepo(t).clean();
        await generatedTokenRepo(t).clean();
      });
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
