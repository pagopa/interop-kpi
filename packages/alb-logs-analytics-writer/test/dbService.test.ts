import {
  describe,
  expect,
  it,
  vi,
  afterAll,
  beforeAll,
  afterEach,
} from "vitest";
import {
  LoadBalancerLogTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { LoadBalancerLog } from "../src/model/load-balancer-log.js";
import { config } from "../src/config/config.js";
import { dbServiceBuilder } from "../src/services/dbService.js";
import {
  dbContext,
  setupDbService,
  truncateTable,
  createValidMockLoadBalancerLog,
  validLogEntries,
  getStagingTableCount,
  getTargetTableCount,
} from "./utils.js";

describe("DB Service Tests for ALB Logs", () => {
  const temporaryDbSchemaName = "pg_temp";
  const stagingTableName = `${LoadBalancerLogTable.logs}${config.mergeTableSuffix}`;
  const targetTableName = LoadBalancerLogTable.logs;

  beforeAll(async () => {
    await setupDbService.setupStagingTables();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await truncateTable(
      dbContext.conn,
      temporaryDbSchemaName,
      config.mergeTableSuffix
    );
  });

  describe("insertRecordsToStaging", () => {
    it("should insert records into the staging table successfully", async () => {
      const records: LoadBalancerLog[] = await createValidMockLoadBalancerLog(
        validLogEntries
      );
      const dbService = dbServiceBuilder(dbContext);
      await dbService.insertRecordsToStaging(records);
      const stagingCount = await getStagingTableCount(
        dbContext.conn,
        stagingTableName
      );

      expect(stagingCount).toBe(5);
    });

    it("should throw an error if database query fails", async () => {
      const mockQueryError =
        "TypeError: Cannot generate an INSERT from an empty array.";
      const dbService = dbServiceBuilder(dbContext);

      await expect(dbService.insertRecordsToStaging([])).rejects.toThrowError(
        genericInternalError(
          `Error inserting into alb_logs_audit staging table: ${mockQueryError}`
        )
      );
    });
  });

  describe("mergeStagingToTarget", () => {
    it("should merge staging data into the target table successfully", async () => {
      const records = await createValidMockLoadBalancerLog(validLogEntries);
      const dbService = dbServiceBuilder(dbContext);

      await dbService.insertRecordsToStaging(records);
      await dbService.mergeStagingToTarget();

      const targetCount = await getTargetTableCount(
        dbContext.conn,
        targetTableName
      );
      expect(targetCount).toBe(5);
    });
  });

  describe("cleanStaging", () => {
    it("should truncate staging table successfully after merge", async () => {
      const records: LoadBalancerLog[] = await createValidMockLoadBalancerLog(
        validLogEntries
      );
      const dbService = dbServiceBuilder(dbContext);

      await dbService.insertRecordsToStaging(records);
      await dbService.mergeStagingToTarget();
      await dbService.cleanStaging();

      const stagingCountAfterClean = await getStagingTableCount(
        dbContext.conn,
        stagingTableName
      );
      expect(stagingCountAfterClean).toBe(0);
    });
  });
});
