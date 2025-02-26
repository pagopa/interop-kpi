/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { IMain, ITask } from "pagopa-interop-kpi-commons";
import { genericInternalError } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { buildColumnSet } from "../utilities/pgHelper.js";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";
import {
  GeneratedTokenMapping,
  JwtGeneratedDatabaseTable,
} from "../model/db.js";

export function clientAssertionRepository(t: ITask<unknown>) {
  const generatedTokenTable = JwtGeneratedDatabaseTable.generated_token;

  return {
    async insert(
      pgp: IMain,
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      try {
        const GeneratedTokenMapping: GeneratedTokenMapping = {
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

        const tokenAuditTableName = `${generatedTokenTable}${config.mergeTableSuffix}`;

        const tokenAuditColumnSet = buildColumnSet<GeneratedTokenAuditDetails>(
          pgp,
          GeneratedTokenMapping,
          tokenAuditTableName
        );

        await t.none(pgp.helpers.insert(records, tokenAuditColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into client_assertion staging table: ${error}`
        );
      }
    },

    async merge(): Promise<void> {
      try {
        await t.none(`
            MERGE INTO ${config.dbSchemaName}.${generatedTokenTable} AS target
            USING ${config.dbSchemaName}.${generatedTokenTable}${config.mergeTableSuffix} AS source
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
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target client_assertion table: ${error}`
        );
      }
    },

    async clean(): Promise<void> {
      try {
        await t.none(
          `TRUNCATE TABLE ${config.dbSchemaName}.${generatedTokenTable}${config.mergeTableSuffix};`
        );
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging client_assertion table: ${error}`
        );
      }
    },
  };
}

export type ClientAssertionRepository = ReturnType<
  typeof clientAssertionRepository
>;
