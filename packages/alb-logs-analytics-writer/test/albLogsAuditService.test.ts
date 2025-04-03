import { createGunzip } from "zlib";
import {
  describe,
  expect,
  it,
  vi,
  afterEach,
  afterAll,
  beforeAll,
  beforeEach,
} from "vitest";
import {
  FileManager,
  batchItems,
  genericLogger,
} from "pagopa-interop-kpi-commons";
import { LoadBalancerLogTable } from "pagopa-interop-kpi-models";
import { config } from "../src/config/config.js";
import { albLogsAuditServiceBuilder } from "../src/services/albLogsAuditService.js";
import {
  LoadBalancerLog,
  LoadBalancerLogArraySchema,
  LoadBalancerLogSchema,
} from "../src/model/load-balancer-log.js";
import { transformFileStream } from "../src/utilities/transformFileStream.js";
import {
  dbContext,
  dbService,
  fileManager,
  getTargetTableCount,
  setupDbService,
  truncateTable,
  validLogEntries,
  createValidGzipStream,
  invalidEntries,
} from "./utils.js";

beforeAll(async () => {
  await setupDbService.setupStagingTables([LoadBalancerLogTable.logs]);
});

afterAll(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  await truncateTable(dbContext.conn, config.dbSchemaName);
});

describe("ALB Logs Audit Service", () => {
  beforeEach(() => {
    vi.spyOn(dbService, "insertRecordsToStaging");
    vi.spyOn(dbService, "mergeStagingToTarget");
    vi.spyOn(dbService, "cleanStaging");
  });

  const validGzData = createValidGzipStream(validLogEntries);
  const emptyGzData = createValidGzipStream("");

  const service = albLogsAuditServiceBuilder(dbService, fileManager);

  it("should process a valid .gz log file", async () => {
    const s3Key = "logs/sample.gz";
    vi.spyOn(fileManager, "get").mockResolvedValue(validGzData);

    await expect(
      service.handleMessage(s3Key, genericLogger)
    ).resolves.not.toThrow();

    expect(fileManager.get).toHaveBeenCalledWith(
      config.s3Bucket,
      s3Key,
      genericLogger
    );
  });

  it("should throw an error if the file is not .gz", async () => {
    const s3Key = "logs/sample.txt";

    await expect(service.handleMessage(s3Key, genericLogger)).rejects.toThrow(
      "Unsupported file format: logs/sample.txt. Only .gz files are allowed."
    );
  });

  it("should handle an empty .gz log file correctly and not calling dbService operations", async () => {
    const fileManagerWithEmptyData: FileManager = {
      ...fileManager,
      get: vi.fn().mockResolvedValue(emptyGzData),
    };

    const serviceWithEmptyFile = albLogsAuditServiceBuilder(
      dbService,
      fileManagerWithEmptyData
    );
    const s3Key = "logs/empty.gz";

    await expect(
      serviceWithEmptyFile.handleMessage(s3Key, genericLogger)
    ).resolves.not.toThrow();

    expect(dbService.insertRecordsToStaging).not.toHaveBeenCalled();
    expect(dbService.mergeStagingToTarget).not.toHaveBeenCalled();
    expect(dbService.cleanStaging).not.toHaveBeenCalled();
  });
  it("should insert the values on the DB", async () => {
    const s3Key = "logs/integration.gz";

    const gzStream = createValidGzipStream(validLogEntries);

    vi.spyOn(fileManager, "get").mockResolvedValue(gzStream);

    const integrationService = albLogsAuditServiceBuilder(
      dbService,
      fileManager
    );
    await integrationService.handleMessage(s3Key, genericLogger);

    const targetCount = await getTargetTableCount(
      dbContext.conn,
      LoadBalancerLogTable.logs
    );
    expect(targetCount).toBe(5);
  });
  it("should properly read and transform a valid .gz log file", async () => {
    const fileStream = createValidGzipStream(validLogEntries).pipe(
      createGunzip()
    );
    const parsedFileStream = transformFileStream(fileStream);
    const transformedLogs: LoadBalancerLog[] = [];

    for await (const log of parsedFileStream) {
      // eslint-disable-next-line functional/immutable-data
      transformedLogs.push(log);
    }
    expect(transformedLogs).toHaveLength(5);
    const loadBalancerParsed =
      LoadBalancerLogArraySchema.safeParse(transformedLogs);
    expect(loadBalancerParsed.success).toBeTruthy();
  });
  it("should skip invalid records but continue processing valid ones", async () => {
    const s3Key = "logs/invalid.gz";

    vi.spyOn(fileManager, "get").mockResolvedValue(
      createValidGzipStream(invalidEntries)
    );

    await expect(
      service.handleMessage(s3Key, genericLogger)
    ).resolves.not.toThrow();

    expect(dbService.insertRecordsToStaging).toHaveBeenCalledTimes(1);
    expect(dbService.mergeStagingToTarget).toHaveBeenCalled();
  });
  it("should process all the records if all the file is well formed", async () => {
    vi.spyOn(fileManager, "get").mockResolvedValue(
      createValidGzipStream(validLogEntries)
    );
    const fileStream = (
      await fileManager.get(config.s3Bucket, "s3Key", genericLogger)
    ).pipe(createGunzip());
    const parsedFileStream = transformFileStream(fileStream);

    // eslint-disable-next-line functional/no-let
    let totalRecordsProcessed = 0;

    const batchesIteration: unknown[][] = [];

    for await (const batch of batchItems(
      LoadBalancerLogSchema,
      parsedFileStream,
      2,
      "s3key",
      genericLogger
    )) {
      // eslint-disable-next-line functional/immutable-data
      batchesIteration.push(batch);
      totalRecordsProcessed += batch.length;
    }

    expect(totalRecordsProcessed).toBe(5);
    expect(batchesIteration.length).toBe(3); // with batch 2, it takes 3 iterations;
  });
  it("should process only the correct entries", async () => {
    vi.spyOn(fileManager, "get").mockResolvedValue(
      createValidGzipStream(invalidEntries)
    );
    const fileStream = (
      await fileManager.get(config.s3Bucket, "s3Key", genericLogger)
    ).pipe(createGunzip());
    const parsedFileStream = transformFileStream(fileStream);

    // eslint-disable-next-line functional/no-let
    let totalRecordsProcessed = 0;

    for await (const batch of batchItems(
      LoadBalancerLogSchema,
      parsedFileStream,
      2,
      "s3key",
      genericLogger
    )) {
      // eslint-disable-next-line functional/immutable-data
      totalRecordsProcessed += batch.length;
    }

    expect(totalRecordsProcessed).toBe(2); // number of correct line on invalidEntries;
  });
});
