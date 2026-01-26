/* eslint-disable functional/immutable-data */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { PassThrough, Readable } from "stream";
import { createGzip } from "zlib";
import { ColumnValue } from "./pgHelper.js";
import { formatTimehhmmss } from "./date.js";

export class CsvWriter<T> {
  private readonly csvStream = new PassThrough();
  private readonly gzipStream: PassThrough;
  private recordsCount = 0;
  private readonly fileName: string;
  private readonly columns: string[];

  constructor(
    tableName: string,
    private readonly mapping: Record<string, (r: T) => ColumnValue>,
    batchIdentifier: string,
    gzCompressionLevel: number
  ) {
    const time = formatTimehhmmss(new Date());
    this.fileName = `${tableName}_${batchIdentifier}_${time}.csv.gz`;
    this.columns = Object.keys(mapping);

    this.gzipStream = createGzip({ level: gzCompressionLevel });
    this.csvStream.pipe(this.gzipStream);
  }

  writeBatch(records: T[]): void {
    for (const record of records) {
      const row = this.columns.map((col) => {
        const value = this.mapping[col](record);
        if (value === null || value === undefined) {
          return "";
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        return String(value).replace(/"/g, '""');
      });

      this.csvStream.write(`"${row.join('","')}"\n`);
      this.recordsCount++;
    }
  }

  hasRecords(): boolean {
    return this.recordsCount > 0;
  }

  getStream(): Readable {
    return this.gzipStream;
  }

  getFileName(): string {
    return this.fileName;
  }

  getPathName(): string {
    const now = new Date();

    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");

    return `year=${year}/month=${month}/day=${day}`;
  }

  getS3ObjectKey(): string {
    return `${this.getPathName()}/${this.getFileName()}`;
  }

  close(): void {
    this.csvStream.end();
  }
}
