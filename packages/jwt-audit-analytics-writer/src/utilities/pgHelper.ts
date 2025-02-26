import {
  IMain,
  ColumnSet,
  IColumnDescriptor,
} from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";

export type ColumnValue = string | number | Date;

/**
 * This is a helper function that generates a ColumnSet for bulk operations using pg-promise.
 * It creates a mapping between object properties and corresponding database columns.
 *
 * @param pgp - The pg-promise main instance used to create the ColumnSet.
 * @param mapping - An object that maps column names to functions which extract the corresponding value from a record.
 * @param tableName - The name of the target table for which the ColumnSet is generated.
 * @returns A ColumnSet configured with the specified columns and table details.
 */
export const buildColumnSet = <T>(
  pgp: IMain,
  mapping: Record<string, (record: T) => ColumnValue>,
  tableName: string
): ColumnSet<T> => {
  const columns = Object.entries(mapping).map(([name, initFn]) => ({
    name,
    init: ({ source }: IColumnDescriptor<T>) => initFn(source),
  }));
  return new pgp.helpers.ColumnSet(columns, {
    table: { table: tableName, schema: config.dbSchemaName },
  });
};
