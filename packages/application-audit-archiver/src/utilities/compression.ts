/* eslint-disable functional/immutable-data */
import { createGzip } from "zlib";
import { pipeline } from "stream";
import { Readable } from "stream";
import { promisify } from "util";

const pipelineAsync = promisify(pipeline);

export async function compressJson(jsonString: string): Promise<Buffer> {
  const gzipStream = createGzip();
  const readStream = Readable.from(jsonString);
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    gzipStream.on("data", (chunk) => chunks.push(chunk));
    gzipStream.on("end", () => resolve(Buffer.concat(chunks)));
    gzipStream.on("error", reject);

    pipelineAsync(readStream, gzipStream).catch(reject);
  });
}
