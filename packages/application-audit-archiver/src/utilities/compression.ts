/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { Readable, Writable } from "stream";
import { config } from "../config/config.js";

export async function compressJson(jsonString: string): Promise<Buffer> {
  const readStream = Readable.from(jsonString);
  const gzipStream = createGzip({ level: config.gzCompressionLevel });

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    const writeStream = new Writable({
      write(chunk, _, callback) {
        resolve(Buffer.concat([...chunks, chunk]));
        callback();
      },
      final(callback) {
        resolve(Buffer.concat(chunks));
        callback();
      },
    });

    pipeline(readStream, gzipStream, writeStream).catch(reject);
  });
}
