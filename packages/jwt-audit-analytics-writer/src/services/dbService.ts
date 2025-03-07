/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DBContext } from "pagopa-interop-kpi-commons";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";
import { clientAssertionRepository } from "../repositories/clientAssertion.repository.js";
import { generatedTokenRepository } from "../repositories/generatedToken.repository.js";

export function dbServiceBuilder(
  { conn, pgp }: DBContext,
  clientAssertionRepo = clientAssertionRepository,
  generatedTokenRepo = generatedTokenRepository
) {
  return {
    async insertRecordsToStaging(
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      await conn.tx(async (t) => {
        await clientAssertionRepo(conn).insert(t, pgp, records);
        await generatedTokenRepo(conn).insert(t, pgp, records);
      });
    },

    async mergeStagingToTarget(): Promise<void> {
      await conn.tx(async (t) => {
        await clientAssertionRepo(conn).merge(t);
        await generatedTokenRepo(conn).merge(t);
      });
    },

    async cleanStaging(): Promise<void> {
      await clientAssertionRepo(conn).clean();
      await generatedTokenRepo(conn).clean();
    },

    async connectionDone(): Promise<void> {
      await conn.done();
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
