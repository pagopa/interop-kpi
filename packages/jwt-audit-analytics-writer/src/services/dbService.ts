/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { GeneratedTokenAuditDetails } from "pagopa-interop-kpi-models";
import { DB } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import { TokenAuditColumn } from "../model/domain/token-audit.js";

export function dbServiceBuilder(db: DB) {
  return {
    async insertStagingRecords(
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      try {
        await db.tx(async (t) => {
          const pgp = db.$config.pgp;

          const clientAssertionMappings: TokenAuditColumn[] = [
            { name: "jwt_id", property: "clientAssertion.jwtId" },
            { name: "issued_at", property: "clientAssertion.issuedAt" },
            { name: "algorithm", property: "clientAssertion.algorithm" },
            { name: "key_id", property: "clientAssertion.keyId" },
            { name: "issuer", property: "clientAssertion.issuer" },
            { name: "subject", property: "clientAssertion.subject" },
            { name: "audience", property: "clientAssertion.audience" },
            {
              name: "expiration_time",
              property: "clientAssertion.expirationTime",
            },
          ];

          const generatedTokenAuditMappings: TokenAuditColumn[] = [
            { name: "jwt_id", property: "jwtId" },
            { name: "correlation_id", property: "correlationId" },
            { name: "issued_at", property: "issuedAt" },
            { name: "client_id", property: "clientId" },
            { name: "organization_id", property: "organizationId" },
            { name: "agreement_id", property: "agreementId" },
            { name: "eservice_id", property: "eserviceId" },
            { name: "descriptor_id", property: "descriptorId" },
            { name: "purpose_id", property: "purposeId" },
            { name: "purpose_version_id", property: "purposeVersionId" },
            { name: "algorithm", property: "algorithm" },
            { name: "key_id", property: "keyId" },
            { name: "audience", property: "audience" },
            { name: "subject", property: "subject" },
            { name: "not_before", property: "notBefore" },
            { name: "expiration_time", property: "expirationTime" },
            { name: "issuer", property: "issuer" },
            {
              name: "client_assertion_jwt_id",
              property: "clientAssertion.jwtId",
            },
          ];

          const clientAssertionColumnSet = new pgp.helpers.ColumnSet(
            clientAssertionMappings,
            {
              table: `${config.dbSchemaName}.staging_client_assertion_audit_details`,
            }
          );

          const generatedTokenAuditColumnSet = new pgp.helpers.ColumnSet(
            generatedTokenAuditMappings,
            {
              table: `${config.dbSchemaName}.staging_generated_token_audit_details`,
            }
          );

          await t.none(pgp.helpers.insert(records, clientAssertionColumnSet));
          await t.none(
            pgp.helpers.insert(records, generatedTokenAuditColumnSet)
          );
        });
      } catch (error: unknown) {
        throw new Error(`Database error inserting data: ${error}`);
      }
    },

    async mergeData(): Promise<void> {
      try {
        await db.tx(async (t) => {
          await t.none(`
            MERGE INTO ${config.dbSchemaName}.client_assertion_audit_details AS target
            USING ${config.dbSchemaName}.staging_client_assertion_audit_details AS source
            ON target.jwt_id = source.jwt_id
            WHEN MATCHED THEN 
              UPDATE SET issued_at = source.issued_at, algorithm = source.algorithm, key_id = source.key_id, 
                          issuer = source.issuer, subject = source.subject, audience = source.audience, 
                          expiration_time = source.expiration_time
            WHEN NOT MATCHED THEN 
              INSERT (jwt_id, issued_at, algorithm, key_id, issuer, subject, audience, expiration_time)
              VALUES (source.jwt_id, source.issued_at, source.algorithm, source.key_id, source.issuer, 
                      source.subject, source.audience, source.expiration_time);
          `);

          await t.none(`
            MERGE INTO ${config.dbSchemaName}.generated_token_audit_details AS target
            USING ${config.dbSchemaName}.staging_generated_token_audit_details AS source
            ON target.jwt_id = source.jwt_id
            WHEN MATCHED THEN 
              UPDATE SET correlation_id = source.correlation_id, issued_at = source.issued_at, 
                          client_id = source.client_id, organization_id = source.organization_id, 
                          agreement_id = source.agreement_id, eservice_id = source.eservice_id, 
                          descriptor_id = source.descriptor_id, purpose_id = source.purpose_id, 
                          expiration_time = source.expiration_time, issuer = source.issuer
            WHEN NOT MATCHED THEN 
              INSERT INTO ${config.dbSchemaName}.generated_token_audit_details 
                SELECT * FROM ${config.dbSchemaName}.staging_generated_token_audit_details;
          `);

          await t.none(
            `TRUNCATE TABLE ${config.dbSchemaName}.staging_client_assertion_audit_details;`
          );

          await t.none(
            `TRUNCATE TABLE ${config.dbSchemaName}.staging_generated_token_audit_details;`
          );
        });
      } catch (error: unknown) {
        throw new Error(`Database error merging data: ${error}`);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
