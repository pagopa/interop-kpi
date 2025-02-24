/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { GeneratedTokenAuditDetails } from "pagopa-interop-kpi-models";
import { DB, IMain } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import {
  insertStagingRecordsError,
  mergeDataError,
} from "../model/domain/errors.js";
import { buildColumnSet, ColumnValue } from "../utilities/pgHelper.js";

export function dbServiceBuilder(db: DB) {
  const clientAssertionTable = `client_assertion_audit_details`;
  const generatedTokenAuditTable = `generated_token_audit_details`;

  return {
    async insertStagingRecords(
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      try {
        await db.tx(async (t) => {
          const pgp: IMain = db.$config.pgp;

          const clientAssertionMapping: Record<
            string,
            (record: GeneratedTokenAuditDetails) => ColumnValue
          > = {
            jwt_id: (record) => record.clientAssertion.jwtId,
            algorithm: (record) => record.clientAssertion.algorithm,
            key_id: (record) => record.clientAssertion.keyId,
            issuer: (record) => record.clientAssertion.issuer,
            subject: (record) => record.clientAssertion.subject,
            audience: (record) => record.clientAssertion.audience,
            issued_at: (record) =>
              new Date(record.clientAssertion.issuedAt * 1000),
            expiration_time: (record) =>
              new Date(record.clientAssertion.expirationTime * 1000),
          };

          const tokenAuditMapping: Record<
            string,
            (record: GeneratedTokenAuditDetails) => ColumnValue
          > = {
            jwt_id: (record) => record.jwtId,
            correlation_id: (record) => record.correlationId,
            issued_at: (record) => new Date(record.issuedAt),
            client_id: (record) => record.clientId,
            organization_id: (record) => record.organizationId,
            agreement_id: (record) => record.agreementId,
            eservice_id: (record) => record.eserviceId,
            descriptor_id: (record) => record.descriptorId,
            purpose_id: (record) => record.purposeId,
            purpose_version_id: (record) => record.purposeVersionId,
            algorithm: (record) => record.algorithm,
            key_id: (record) => record.keyId,
            audience: (record) => record.audience,
            subject: (record) => record.subject,
            not_before: (record) => new Date(record.notBefore),
            expiration_time: (record) => new Date(record.expirationTime),
            issuer: (record) => record.issuer,
            client_assertion_jwt_id: (record) => record.clientAssertion.jwtId,
          };

          const clientAssertionTableName = `${clientAssertionTable}${config.mergeTableSuffix}`;
          const tokenAuditTableName = `${generatedTokenAuditTable}${config.mergeTableSuffix}`;

          const clientAssertionColumnSet =
            buildColumnSet<GeneratedTokenAuditDetails>(
              pgp,
              clientAssertionMapping,
              clientAssertionTableName
            );

          const tokenAuditColumnSet =
            buildColumnSet<GeneratedTokenAuditDetails>(
              pgp,
              tokenAuditMapping,
              tokenAuditTableName
            );

          await t.none(pgp.helpers.insert(records, clientAssertionColumnSet));
          await t.none(pgp.helpers.insert(records, tokenAuditColumnSet));
        });
      } catch (error: unknown) {
        throw insertStagingRecordsError(error);
      }
    },

    async mergeData(): Promise<void> {
      try {
        await db.tx(async (t) => {
          await t.none(`
            WITH duplicates AS (
              SELECT jwt_id,
                    ROW_NUMBER() OVER (PARTITION BY jwt_id ORDER BY issued_at) AS rn
              FROM ${config.dbSchemaName}.${clientAssertionTable}${config.mergeTableSuffix}
            )
            DELETE FROM ${config.dbSchemaName}.${clientAssertionTable}${config.mergeTableSuffix}
            USING duplicates
            WHERE ${config.dbSchemaName}.${clientAssertionTable}${config.mergeTableSuffix}.jwt_id = duplicates.jwt_id
              AND duplicates.rn > 1;
          `);

          await t.none(`
            WITH duplicates AS (
              SELECT jwt_id,
                    ROW_NUMBER() OVER (PARTITION BY jwt_id ORDER BY issued_at) AS rn
              FROM ${config.dbSchemaName}.${generatedTokenAuditTable}${config.mergeTableSuffix}
            )
            DELETE FROM ${config.dbSchemaName}.${generatedTokenAuditTable}${config.mergeTableSuffix}
            USING duplicates
            WHERE ${config.dbSchemaName}.${generatedTokenAuditTable}${config.mergeTableSuffix}.jwt_id = duplicates.jwt_id
              AND duplicates.rn > 1;
          `);

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

          await t.none(`
            MERGE INTO ${config.dbSchemaName}.${generatedTokenAuditTable} AS target
            USING ${config.dbSchemaName}.${generatedTokenAuditTable}${config.mergeTableSuffix} AS source
            ON target.jwt_id = source.jwt_id
            WHEN MATCHED THEN 
              UPDATE
                SET correlation_id       = source.correlation_id,
                    issued_at            = source.issued_at,
                    client_id            = source.client_id,
                    organization_id      = source.organization_id,
                    agreement_id         = source.agreement_id,
                    eservice_id          = source.eservice_id,
                    descriptor_id        = source.descriptor_id,
                    purpose_id           = source.purpose_id,
                    purpose_version_id   = source.purpose_version_id,
                    algorithm            = source.algorithm,
                    key_id               = source.key_id,
                    audience             = source.audience,
                    subject              = source.subject,
                    not_before           = source.not_before,
                    expiration_time      = source.expiration_time,
                    issuer               = source.issuer,
                    client_assertion_jwt_id = source.client_assertion_jwt_id
            WHEN NOT MATCHED THEN 
              INSERT (
                jwt_id,
                correlation_id,
                issued_at,
                client_id,
                organization_id,
                agreement_id,
                eservice_id,
                descriptor_id,
                purpose_id,
                purpose_version_id,
                algorithm,
                key_id,
                audience,
                subject,
                not_before,
                expiration_time,
                issuer,
                client_assertion_jwt_id
              )
              VALUES (
                source.jwt_id,
                source.correlation_id,
                source.issued_at,
                source.client_id,
                source.organization_id,
                source.agreement_id,
                source.eservice_id,
                source.descriptor_id,
                source.purpose_id,
                source.purpose_version_id,
                source.algorithm,
                source.key_id,
                source.audience,
                source.subject,
                source.not_before,
                source.expiration_time,
                source.issuer,
                source.client_assertion_jwt_id
              );
          `);

          await t.none(
            `TRUNCATE TABLE ${config.dbSchemaName}.${clientAssertionTable}${config.mergeTableSuffix};`
          );

          await t.none(
            `TRUNCATE TABLE ${config.dbSchemaName}.${generatedTokenAuditTable}${config.mergeTableSuffix};`
          );
        });
      } catch (error: unknown) {
        throw mergeDataError(error);
      }
    },

    async initializeStagingTables(): Promise<void> {
      const createClientAssertionTableQuery = `
        CREATE TABLE IF NOT EXISTS ${config.dbSchemaName}.${clientAssertionTable}${config.mergeTableSuffix} (
          LIKE ${config.dbSchemaName}.${clientAssertionTable}
        );
      `;

      const createGeneratedTokenTableQuery = `
        CREATE TABLE IF NOT EXISTS ${config.dbSchemaName}.${generatedTokenAuditTable}${config.mergeTableSuffix} (
          LIKE ${config.dbSchemaName}.${generatedTokenAuditTable}
        );
      `;

      await db.query(createClientAssertionTableQuery);
      await db.query(createGeneratedTokenTableQuery);
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
