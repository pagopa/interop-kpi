/* eslint-disable max-params */
import { z } from "zod";

/**
 * Generates an INSERT query that inserts new records from a staging table
 * into the target table.
 *
 * @param tableSchema - A Zod object schema refering to the table model from which to extract the list of keys.
 * @param schemaName - The target db schema name.
 * @param tableName - The staging and target table name.
 * @param stagingSuffix - A suffix appended to the table name to indicate the staging table.
 * @param keysOn - The keys to be used for the ON condition (e.g., ["correlation_id"]).
 * @param deduplicationOptions - Optional configuration to limit the JOIN
 * against existing target records to a recent time window.
 *
 * This is used to avoid scanning the entire target table when checking
 * for duplicates, by considering only records created or updated
 * within the last N days.
 *
 * @param deduplicationOptions.joinTimeFilterColumn
 *   The column used to determine whether a target record is considered "recent".
 * @param deduplicationOptions.maxDaysTolerance
 *   Number of days to look back from the current date when selecting
 *   existing target records to compare against.
 */
export function generateMergeQuery<T extends z.ZodRawShape>(
  tableSchema: z.ZodObject<T>,
  schemaName: string,
  tableName: string,
  stagingSuffix: string,
  keysOn: Array<keyof T>,
  deduplicationOptions?: {
    joinTimeFilterColumn?: keyof T;
    maxDaysTolerance?: number;
  }
): string {
  const keys = Object.keys(tableSchema.shape);

  const stagingTable = `${tableName}${stagingSuffix}`;
  const targetTable = `${schemaName}.${tableName}`;

  const columnList = keys.join(", ");

  const onCondition = keysOn
    .map((k) => `t.${String(k)} = s.${String(k)}`)
    .join(" AND ");

  const nullCondition = keysOn
    .map((k) => `t.${String(k)} IS NULL`)
    .join(" AND ");

  const timeFilter =
    deduplicationOptions?.joinTimeFilterColumn &&
    deduplicationOptions?.maxDaysTolerance
      ? `WHERE ${String(
          deduplicationOptions.joinTimeFilterColumn
        )} > (CURRENT_DATE - INTERVAL '${
          deduplicationOptions.maxDaysTolerance
        } days')`
      : "";

  return `
    INSERT INTO ${targetTable} (${columnList})
    SELECT ${keys.map((k) => `s.${k}`).join(", ")}
    FROM ${stagingTable} s
    LEFT JOIN (
      SELECT ${keysOn.map(String).join(", ")}
      FROM ${targetTable}
      ${timeFilter}
    ) t
      ON ${onCondition}
    WHERE ${nullCondition};
`;
}

/**
 * Generates a deduplication DELETE query for a given staging table.
 *
 * @param stagingTableName - The staging table name.
 * @param partitionKey - Column name to PARTITION BY
 * @returns The deduplication SQL query as a string.
 */
export function generateDeduplicationQuery(
  stagingTableName: string,
  partitionKey: string,
  orderByColumn: string
): string {
  return `
    DELETE FROM ${stagingTableName}
    USING (
      SELECT _seq FROM (
        SELECT _seq,
              ROW_NUMBER() OVER (
                PARTITION BY ${partitionKey}
                ORDER BY ${orderByColumn} DESC, _seq
              ) AS rn
        FROM ${stagingTableName}
      ) sub
      WHERE rn > 1
    ) d
    WHERE ${stagingTableName}._seq = d._seq;
  `;
}
