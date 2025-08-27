import { z } from "zod";

/**
 * Generates a MERGE SQL query
 *
 * @param tableSchema - A Zod object schema refering to the table model from which to extract the list of keys.
 * @param schemaName - The target db schema name.
 * @param tableName - The staging and target table name.
 * @param stagingSuffix - A suffix appended to the table name to indicate the staging table.
 * @param keysOn - The keys to be used for the ON condition (e.g., ["correlation_id"]).
 * @returns The generated MERGE SQL query as a string.
 */
export function generateMergeQuery<T extends z.ZodRawShape>(
  tableSchema: z.ZodObject<T>,
  schemaName: string,
  tableName: string,
  stagingSuffix: string,
  keysOn: Array<keyof T>
): string {
  const keys = Object.keys(tableSchema.shape);

  const updateSet = keys.map((k) => `${k} = source.${k}`).join(",\n    ");

  const columns = keys.join(", ");
  const values = keys.map((k) => `source.${k}`).join(", ");

  const onCondition = keysOn
    .map(
      (key) =>
        `${schemaName}.${tableName}.${String(key)} = source.${String(key)}`
    )
    .join(" AND ");

  return `
      MERGE INTO ${schemaName}.${tableName}
      USING ${tableName}${stagingSuffix} AS source
      ON ${onCondition}
      WHEN MATCHED THEN
        UPDATE SET
          ${updateSet}
      WHEN NOT MATCHED THEN
        INSERT (${columns})
        VALUES (${values});
    `;
}

/**
 * Generates a deduplication DELETE query for a given staging table.
 *
 * @param tableName - The staging and target table name.
 * @param partitionKey - Column name to PARTITION BY
 * @returns The deduplication SQL query as a string.
 */
export function generateDeduplicationQuery(
  tableName: string,
  partitionKey: string
): string {
  return `
    DELETE FROM ${tableName}
    USING (
      SELECT _seq FROM (
        SELECT _seq,
              ROW_NUMBER() OVER (
                PARTITION BY ${partitionKey}
                ORDER BY issued_at DESC, _seq
              ) AS rn
        FROM ${tableName}
      ) sub
      WHERE rn > 1
    ) d
    WHERE ${tableName}._seq = d._seq;
  `;
}
