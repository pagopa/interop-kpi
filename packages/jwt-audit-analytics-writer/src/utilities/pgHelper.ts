import {
  IMain,
  ColumnSet,
  IColumnDescriptor,
} from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";

export type ColumnValue = string | number | Date;

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
