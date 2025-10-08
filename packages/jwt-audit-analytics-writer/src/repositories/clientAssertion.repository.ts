/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  ITask,
  buildColumnSet,
  generateDeduplicationQuery,
  generateMergeQuery,
  truncateTimestampDecimals,
} from "pagopa-interop-kpi-commons";
import { genericInternalError, JwtDbTable } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";
import { ClientAssertionMapping, ClientAssertionSchema } from "../model/db.js";

export function clientAssertionRepository(conn: DBConnection) {
  const clientAssertionTable = JwtDbTable.client_assertion;
  const clientAssertionStagingTable = `${clientAssertionTable}${config.mergeTableSuffix}`;

  return {
    async insert(
      t: ITask<unknown>,
      pgp: IMain,
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      try {
        const clientAssertionMapping: ClientAssertionMapping = {
          jwt_id: (record) => record.clientAssertion.jwtId,
          issued_at: (record) =>
            truncateTimestampDecimals(record.clientAssertion.issuedAt),
          issued_at_tz: (record) =>
            new Date(
              truncateTimestampDecimals(record.clientAssertion.issuedAt)
            ),
          issued_at_raw: (record) => String(record.clientAssertion.issuedAt),
          algorithm: (record) => record.clientAssertion.algorithm,
          key_id: (record) => record.clientAssertion.keyId,
          issuer: (record) => record.clientAssertion.issuer,
          subject: (record) => record.clientAssertion.subject,
          audience: (record) => record.clientAssertion.audience,
          expiration_time: (record) =>
            truncateTimestampDecimals(record.clientAssertion.expirationTime),
          expiration_time_tz: (record) =>
            new Date(
              truncateTimestampDecimals(record.clientAssertion.expirationTime)
            ),
          expiration_time_raw: (record) =>
            String(record.clientAssertion.expirationTime),
          generated_token_jwt_id: (record) => record.jwtId,
        };

        const clientAssertionColumnSet =
          buildColumnSet<GeneratedTokenAuditDetails>(
            pgp,
            clientAssertionMapping,
            clientAssertionStagingTable
          );

        await t.none(pgp.helpers.insert(records, clientAssertionColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into ${clientAssertionStagingTable} staging table: ${error}`
        );
      }
    },

    async merge(t: ITask<unknown>): Promise<void> {
      try {
        const clientAssertionMergeQuery = generateMergeQuery(
          ClientAssertionSchema,
          config.dbSchemaName,
          clientAssertionTable,
          config.mergeTableSuffix,
          ["generated_token_jwt_id"]
        );
        await t.none(clientAssertionMergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${clientAssertionTable} table: ${error}`
        );
      }
    },

    async deduplicate(t: ITask<unknown>): Promise<void> {
      try {
        const deduplicationQuery = generateDeduplicationQuery(
          clientAssertionStagingTable,
          "generated_token_jwt_id"
        );
        await t.none(deduplicationQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error deduplicating staging ${clientAssertionStagingTable} table: ${error}`
        );
      }
    },

    async clean(): Promise<void> {
      try {
        await conn.none(`TRUNCATE TABLE ${clientAssertionStagingTable};`);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging ${clientAssertionStagingTable} table: ${error}`
        );
      }
    },
  };
}

export type ClientAssertionRepository = ReturnType<
  typeof clientAssertionRepository
>;
