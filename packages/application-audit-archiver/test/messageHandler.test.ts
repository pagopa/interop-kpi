/* eslint-disable functional/immutable-data */
/* eslint-disable functional/no-let */
import { createGunzip } from "zlib";
import { pipeline, Readable } from "stream";
import { promisify } from "util";
import { describe, it, expect, vi } from "vitest";
import { genericLogger, formatTimehhmmss } from "pagopa-interop-kpi-commons";
import { compressJson } from "../src/utilities/compression.js";
import { handleMessages } from "../src/handler/messagesHandler.js";
import {
  fileManager,
  getValidKafkaMessage,
  invalidKafkaMessage,
  validAuditEvent,
} from "./utils.js";

const pipelineAsync = promisify(pipeline);

describe("handleMessages", () => {
  it("should compress and decompress a valid NDJSON string", async () => {
    const ndjsonString = [
      JSON.stringify(validAuditEvent),
      JSON.stringify(validAuditEvent),
    ].join("\n");

    const compressedBuffer = await compressJson(ndjsonString);
    expect(Buffer.isBuffer(compressedBuffer)).toBe(true);

    const gunzip = createGunzip();
    let decompressed = "";
    gunzip.on("data", (chunk) => (decompressed += chunk.toString()));
    await pipelineAsync(Readable.from(compressedBuffer), gunzip);

    expect(decompressed).toBe(ndjsonString);
  });

  it("should process a single valid message and store on s3bucket with valid name and NDJSON content", async () => {
    const mockStoreBytes = vi.fn().mockResolvedValue("mocked-s3-key");
    fileManager.storeBytes = mockStoreBytes;

    const fakeDate = new Date("2025-03-18T12:34:56");
    vi.useFakeTimers();
    vi.setSystemTime(fakeDate);

    await handleMessages(
      [getValidKafkaMessage(validAuditEvent)],
      fileManager,
      genericLogger
    );

    const s3File = mockStoreBytes.mock.calls[0][0];
    const year = fakeDate.getFullYear();
    const month = String(fakeDate.getMonth() + 1).padStart(2, "0");
    const day = String(fakeDate.getDate()).padStart(2, "0");
    const time = formatTimehhmmss(fakeDate);

    expect(s3File.path).toBe(`year=${year}/month=${month}/day=${day}`);
    expect(s3File.name).toContain(`${year}${month}${day}_${time}_`);
    expect(s3File.name).toMatch(/\.ndjson\.gz$/);
    expect(mockStoreBytes).toHaveBeenCalledWith(s3File, genericLogger);

    const gunzip = createGunzip();
    let decompressed = "";
    gunzip.on("data", (chunk) => (decompressed += chunk.toString()));
    await pipelineAsync(Readable.from(s3File.content), gunzip);

    const line = decompressed.trim();
    const parsed = JSON.parse(line);
    expect(parsed).toEqual(validAuditEvent);
  });

  it("should process an empty messages array", async () => {
    const mockStoreBytes = vi.fn().mockResolvedValue("mocked-s3-key");
    fileManager.storeBytes = mockStoreBytes;

    const fakeDate = new Date("2025-03-18T12:34:56");
    vi.useFakeTimers();
    vi.setSystemTime(fakeDate);

    await handleMessages([], fileManager, genericLogger);

    expect(mockStoreBytes).toHaveBeenCalledTimes(0);
  });

  it("should process multiple valid messages", async () => {
    const mockStoreBytes = vi.fn().mockResolvedValue("mocked-s3-key");
    fileManager.storeBytes = mockStoreBytes;

    const fakeDate = new Date("2025-03-18T12:34:56");
    vi.useFakeTimers();
    vi.setSystemTime(fakeDate);

    await handleMessages(
      [
        getValidKafkaMessage(validAuditEvent),
        getValidKafkaMessage(validAuditEvent),
      ],
      fileManager,
      genericLogger
    );

    expect(mockStoreBytes).toHaveBeenCalledTimes(1);
    const s3File = mockStoreBytes.mock.calls[0][0];

    const gunzip = createGunzip();
    let decompressed = "";
    gunzip.on("data", (chunk) => (decompressed += chunk.toString()));
    await pipelineAsync(Readable.from(s3File.content), gunzip);

    const lines = decompressed.split("\n").filter(Boolean);
    const parsed = lines.map((line) => JSON.parse(line));

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
  });

  it("should process multiple messages with different dates and store each group correctly", async () => {
    const mockStoreBytes = vi.fn().mockResolvedValue("mocked-s3-key");
    fileManager.storeBytes = mockStoreBytes;

    const fakeNow = new Date("2025-03-20T09:00:00");
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);

    const dateStrings = [
      "2025-03-17T10:00:00",
      "2025-03-18T10:00:00",
      "2025-03-19T10:00:00",
    ];

    const messages = dateStrings.map((dateStr) =>
      getValidKafkaMessage({
        ...validAuditEvent,
        timestamp: new Date(dateStr).getTime(),
      })
    );

    await handleMessages(messages, fileManager, genericLogger);

    expect(mockStoreBytes).toHaveBeenCalledTimes(3);

    dateStrings.forEach((dateStr, index) => {
      const date = new Date(dateStr);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      const time = formatTimehhmmss(fakeNow);

      const s3File = mockStoreBytes.mock.calls[index][0];
      expect(s3File.path).toBe(`year=${year}/month=${month}/day=${day}`);
      expect(s3File.name).toContain(`${year}${month}${day}_${time}_`);
      expect(mockStoreBytes).toHaveBeenCalledWith(s3File, genericLogger);
    });
  });

  it("should throw genericInternalError if storeBytes fails", async () => {
    fileManager.storeBytes = vi
      .fn()
      .mockRejectedValue(new Error("mocked error"));
    await expect(
      handleMessages(
        [getValidKafkaMessage(validAuditEvent)],
        fileManager,
        genericLogger
      )
    ).rejects.toThrowError(/Write operation failed - mocked error/);
  });

  it("should throw genericInternalError if message is invalid", async () => {
    const mockStoreBytes = vi.fn().mockResolvedValue("mocked-s3-key");
    fileManager.storeBytes = mockStoreBytes;

    await expect(
      handleMessages([invalidKafkaMessage], fileManager, genericLogger)
    ).rejects.toThrowError(/Write operation failed - Invalid message/);
  });
});
