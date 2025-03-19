import { afterEach, describe, expect, it } from "vitest";
import { KafkaMessage } from "kafkajs";
import { genericLogger } from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditEvent,
  ApplicationDbTable,
} from "pagopa-interop-kpi-models";
import { handleMessages } from "../src/handlers/messagesHandler.js";
import { config } from "../src/config/config.js";
import {
  dbContext,
  getMockApplicationAudits,
  getStagingTableCount,
  getTargetTableCount,
  mockEventsToKafkaMessages,
  truncateTables,
} from "./utils.js";

describe("Messages Handler tests", () => {
  const { conn } = dbContext;
  const beginRequestStagingTableName = `${ApplicationDbTable.begin_request}${config.mergeTableSuffix}`;
  const endRequestStagingTableName = `${ApplicationDbTable.end_request}${config.mergeTableSuffix}`;
  const temporaryDbSchemaName = "pg_temp";

  afterEach(async () => {
    const stagingTables = [
      beginRequestStagingTableName,
      endRequestStagingTableName,
    ];
    await truncateTables(conn, temporaryDbSchemaName, stagingTables);

    const targetTables = [
      ApplicationDbTable.begin_request,
      ApplicationDbTable.end_request,
    ];
    await truncateTables(conn, config.dbSchemaName, targetTables);
  });

  describe("handleMessages", () => {
    it("processing empty messages from kafka should not throw error", async () => {
      const emptyBatchMessages: KafkaMessage[] = [];

      await expect(
        handleMessages(emptyBatchMessages, dbContext, genericLogger)
      ).resolves.toBeUndefined();
    });

    it("should parse kafka messages and persist their data to the database successfully", async () => {
      const beginRequestStagingTableName = `${ApplicationDbTable.begin_request}${config.mergeTableSuffix}`;
      const endRequestStagingTableName = `${ApplicationDbTable.end_request}${config.mergeTableSuffix}`;

      const events = getMockApplicationAudits<ApplicationAuditEvent>(5, 15);
      const messages = mockEventsToKafkaMessages(events);

      await handleMessages(messages, dbContext, genericLogger);

      const beginRequestStagingCount = await getStagingTableCount(
        conn,
        beginRequestStagingTableName
      );
      expect(beginRequestStagingCount).toBe(0);

      const endRequestStagingCount = await getStagingTableCount(
        conn,
        endRequestStagingTableName
      );
      expect(endRequestStagingCount).toBe(0);

      const beginRequestTargetCount = await getTargetTableCount(
        conn,
        ApplicationDbTable.begin_request
      );
      expect(beginRequestTargetCount).toBe(5);

      const endRequestTargetTokenCount = await getTargetTableCount(
        conn,
        ApplicationDbTable.end_request
      );
      expect(endRequestTargetTokenCount).toBe(15);
    });

    it("should throw a parsing error when encountering a kafka message with a null value", async () => {
      await expect(async () => {
        await handleMessages(
          [{ value: null } as unknown as KafkaMessage],
          dbContext,
          genericLogger
        );
      }).rejects.toThrow();
    });
  });
});
