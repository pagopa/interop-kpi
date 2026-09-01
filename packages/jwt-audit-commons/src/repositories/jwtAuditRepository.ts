/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  ColumnValue,
  DBConnection,
  IMain,
  ITask,
  buildColumnSet,
  generateDeduplicationQuery,
  generateMergeQuery,
} from "pagopa-interop-kpi-commons";
import { genericInternalError } from "pagopa-interop-kpi-models";
import { z } from "zod";

export type JwtAuditRepositoryConfig = {
  readonly dbSchemaName: string;
  readonly maxDaysToleranceForDuplicateDelay?: number;
  readonly mergeTableSuffix: string;
  readonly redshiftIamRole: string;
  readonly s3CopyBucket: string;
};

export type JwtAuditRepositoryDefinition<
  TRecord,
  TShape extends z.ZodRawShape
> = {
  readonly tableName: string;
  readonly tableSchema: z.ZodObject<TShape>;
  readonly mapping: Record<string, (record: TRecord) => ColumnValue>;
  readonly mergeKeys: Array<keyof TShape>;
  readonly mergeTimeFilter?: {
    readonly column: keyof TShape;
  };
  readonly deduplication: {
    readonly partitionKey: keyof TShape;
    readonly orderBy: keyof TShape;
  };
  readonly selectRecords?: (records: TRecord[]) => TRecord[];
};

export function jwtAuditRepositoryBuilder<
  TRecord,
  TShape extends z.ZodRawShape
>(
  conn: DBConnection,
  config: JwtAuditRepositoryConfig,
  definition: JwtAuditRepositoryDefinition<TRecord, TShape>
) {
  const stagingTable = `${definition.tableName}${config.mergeTableSuffix}`;

  return {
    async copyFromS3ToStaging(s3ObjectKey: string): Promise<void> {
      try {
        const copyQuery = `
          COPY ${stagingTable}
          FROM 's3://${config.s3CopyBucket}/${s3ObjectKey}'
          IAM_ROLE '${config.redshiftIamRole}'
          CSV
          GZIP
          TIMEFORMAT 'auto'
          BLANKSASNULL
          EMPTYASNULL;
        `;

        await conn.none(copyQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error copying data from S3 to staging ${stagingTable}: ${error}`
        );
      }
    },

    async insert(
      t: ITask<unknown>,
      pgp: IMain,
      records: TRecord[]
    ): Promise<void> {
      try {
        const columnSet = buildColumnSet<TRecord>(
          pgp,
          definition.mapping,
          stagingTable
        );
        const selectedRecords = definition.selectRecords?.(records) ?? records;

        if (
          definition.selectRecords !== undefined &&
          selectedRecords.length === 0
        ) {
          return;
        }

        await t.none(pgp.helpers.insert(selectedRecords, columnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into ${stagingTable} staging table: ${error}`
        );
      }
    },

    async merge(t: ITask<unknown>): Promise<void> {
      try {
        const mergeQuery = generateMergeQuery(
          definition.tableSchema,
          config.dbSchemaName,
          definition.tableName,
          config.mergeTableSuffix,
          definition.mergeKeys,
          definition.mergeTimeFilter
            ? {
                joinTimeFilterColumn: definition.mergeTimeFilter.column,
                maxDaysTolerance: config.maxDaysToleranceForDuplicateDelay,
              }
            : undefined
        );

        await t.none(mergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${definition.tableName} table: ${error}`
        );
      }
    },

    async deduplicate(t: ITask<unknown>): Promise<void> {
      try {
        const deduplicationQuery = generateDeduplicationQuery(
          stagingTable,
          String(definition.deduplication.partitionKey),
          String(definition.deduplication.orderBy)
        );
        await t.none(deduplicationQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error deduplicating staging ${stagingTable} table: ${error}`
        );
      }
    },

    async clean(): Promise<void> {
      try {
        await conn.none(`TRUNCATE TABLE ${stagingTable};`);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging ${stagingTable} table: ${error}`
        );
      }
    },
  };
}
