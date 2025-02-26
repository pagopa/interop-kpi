/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { IMain, ITask } from "pagopa-interop-kpi-commons";
import { genericInternalError } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { buildColumnSet } from "../utilities/pgHelper.js";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";
import {
  ClientAssertionMapping,
  JwtGeneratedDatabaseTable,
} from "../model/db.js";

export function generatedTokenRepository(t: ITask<unknown>) {
  const clientAssertionTable = JwtGeneratedDatabaseTable.client_assertion;

  return {
    async insert(
      pgp: IMain,
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      try {
        const clientAssertionMapping: ClientAssertionMapping = {
          jwt_id: (record) => record.clientAssertion.jwtId,
          issued_at: (record) => new Date(record.clientAssertion.issuedAt),
          algorithm: (record) => record.clientAssertion.algorithm,
          key_id: (record) => record.clientAssertion.keyId,
          issuer: (record) => record.clientAssertion.issuer,
          subject: (record) => record.clientAssertion.subject,
          audience: (record) => record.clientAssertion.audience,
          expiration_time: (record) =>
            new Date(record.clientAssertion.expirationTime),
        };

        const clientAssertionTableName = `${clientAssertionTable}${config.mergeTableSuffix}`;

        const clientAssertionColumnSet =
          buildColumnSet<GeneratedTokenAuditDetails>(
            pgp,
            clientAssertionMapping,
            clientAssertionTableName
          );

        await t.none(pgp.helpers.insert(records, clientAssertionColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into generated_token staging table: ${error}`
        );
      }
    },

    async merge(): Promise<void> {
      try {
        await t.none(`
            MERGE INTO ${config.dbSchemaName}.${clientAssertionTable} AS target 
            USING ${config.dbSchemaName}.${clientAssertionTable}${config.mergeTableSuffix} AS source
              ON target.jwt_id = source.jwt_id
            WHEN MATCHED THEN
              UPDATE
                SET issued_at       = source.issued_at,
                    algorithm       = source.algorithm,
                    key_id          = source.key_id,
                    issuer          = source.issuer,
                    subject         = source.subject,
                    audience        = source.audience,
                    expiration_time = source.expiration_time
            WHEN NOT MATCHED THEN
              INSERT (
                jwt_id, 
                issued_at, 
                algorithm, 
                key_id, 
                issuer, 
                subject, 
                audience, 
                expiration_time
                )
              VALUES (
                source.jwt_id, 
                source.issued_at, 
                source.algorithm, 
                source.key_id, 
                source.issuer, 
                source.subject, 
                source.audience, 
                source.expiration_time
              );
          `);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target generated_token table: ${error}`
        );
      }
    },

    async clean(): Promise<void> {
      try {
        await t.none(
          `TRUNCATE TABLE ${config.dbSchemaName}.${clientAssertionTable}${config.mergeTableSuffix};`
        );
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging generated_token table: ${error}`
        );
      }
    },
  };
}

export type GeneratedTokenRepository = ReturnType<
  typeof generatedTokenRepository
>;
