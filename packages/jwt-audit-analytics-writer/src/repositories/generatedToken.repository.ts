/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  ITask,
  buildColumnSet,
  generateMergeQuery,
} from "pagopa-interop-kpi-commons";
import { genericInternalError, JwtDbTable } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";
import { GeneratedTokenMapping, GeneratedTokenSchema } from "../model/db.js";

export function generatedTokenRepository(conn: DBConnection) {
  const generatedTokenTable = JwtDbTable.generated_token;
  const tokenAuditStagingTable = `${generatedTokenTable}${config.mergeTableSuffix}`;

  return {
    async insert(
      t: ITask<unknown>,
      pgp: IMain,
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      try {
        const generatedTokenMapping: GeneratedTokenMapping = {
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

        const tokenAuditColumnSet = buildColumnSet<GeneratedTokenAuditDetails>(
          pgp,
          generatedTokenMapping,
          tokenAuditStagingTable
        );

        await t.none(pgp.helpers.insert(records, tokenAuditColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into ${tokenAuditStagingTable} staging table: ${error}`
        );
      }
    },

    async merge(t: ITask<unknown>): Promise<void> {
      try {
        const generatedTokenMergeQuery = generateMergeQuery(
          GeneratedTokenSchema,
          config.dbSchemaName,
          generatedTokenTable,
          config.mergeTableSuffix,
          ["jwt_id"]
        );
        await t.none(generatedTokenMergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${generatedTokenTable} table: ${error}`
        );
      }
    },

    async clean(): Promise<void> {
      try {
        await conn.none(`TRUNCATE TABLE ${tokenAuditStagingTable};`);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging ${tokenAuditStagingTable} table: ${error}`
        );
      }
    },
  };
}

export type GeneratedTokenRepository = ReturnType<
  typeof generatedTokenRepository
>;
