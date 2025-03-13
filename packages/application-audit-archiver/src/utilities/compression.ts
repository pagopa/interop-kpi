import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { Readable, Writable } from "stream";
import { config } from "../config/config.js";

export async function compressJson(jsonString: string): Promise<Buffer> {
  const readStream = Readable.from(jsonString);
  const gzipStream = createGzip({ level: config.gzCompressionLevel });

  const compressedChunks: Buffer[] = [];
  const writeStream = new Writable({
    write(chunk, _, callback) {
      compressedChunks.push(chunk);
      callback();
    },
  });

  await pipeline(readStream, gzipStream, writeStream);

  return Buffer.concat(compressedChunks);
}
