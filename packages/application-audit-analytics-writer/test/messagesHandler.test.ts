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
  fileManager,
  getMockApplicationAudits,
  getStagingTableCount,
  getTargetTableCount,
  mockEventsToKafkaMessages,
  truncateTables,
} from "./utils.js";

describe("Messages Handler tests", () => {
  const { conn } = dbContext;
  const beginRequestStagingTable = `${ApplicationDbTable.begin_request}${config.mergeTableSuffix}`;
  const endRequestStagingTable = `${ApplicationDbTable.end_request}${config.mergeTableSuffix}`;
  const temporaryDbSchema = "pg_temp";

  afterEach(async () => {
    const stagingTables = [beginRequestStagingTable, endRequestStagingTable];
    await truncateTables(conn, temporaryDbSchema, stagingTables);

    const targetTables = [
      ApplicationDbTable.begin_request,
      ApplicationDbTable.end_request,
      ApplicationDbTable.end_request_session_token_exchange,
      ApplicationDbTable.end_request_auth_server,
    ];
    await truncateTables(conn, config.dbSchemaName, targetTables);
  });

  describe("handleMessages", () => {
    it("processing empty messages from kafka should not throw error", async () => {
      const emptyBatchMessages: KafkaMessage[] = [];

      await expect(
        handleMessages(
          emptyBatchMessages,
          dbContext,
          fileManager,
          genericLogger
        )
      ).resolves.toBeUndefined();
    });

    it("should parse kafka messages and persist their data to the database successfully", async () => {
      const beginRequestStagingTable = `${ApplicationDbTable.begin_request}${config.mergeTableSuffix}`;
      const endRequestStagingTable = `${ApplicationDbTable.end_request}${config.mergeTableSuffix}`;
      const endRequestSessionTokenExchangeStagingTable = `${ApplicationDbTable.end_request_session_token_exchange}${config.mergeTableSuffix}`;
      const endRequestAuthServerStagingTable = `${ApplicationDbTable.end_request_auth_server}${config.mergeTableSuffix}`;

      const events = getMockApplicationAudits<ApplicationAuditEvent>(
        6,
        3,
        2,
        1
      );
      const messages = mockEventsToKafkaMessages(events);

      await handleMessages(messages, dbContext, fileManager, genericLogger);

      const beginRequestStagingCount = await getStagingTableCount(
        conn,
        beginRequestStagingTable
      );
      expect(beginRequestStagingCount).toBe(0);

      const endRequestStagingCount = await getStagingTableCount(
        conn,
        endRequestStagingTable
      );
      expect(endRequestStagingCount).toBe(0);

      const endRequestSessionTokenExchangeStagingCount =
        await getStagingTableCount(
          conn,
          endRequestSessionTokenExchangeStagingTable
        );
      expect(endRequestSessionTokenExchangeStagingCount).toBe(0);

      const endRequestAuthServerStagingCount = await getStagingTableCount(
        conn,
        endRequestAuthServerStagingTable
      );
      expect(endRequestAuthServerStagingCount).toBe(0);

      const beginRequestTargetCount = await getTargetTableCount(
        conn,
        ApplicationDbTable.begin_request
      );
      expect(beginRequestTargetCount).toBe(6);

      const endRequestTargetCount = await getTargetTableCount(
        conn,
        ApplicationDbTable.end_request
      );
      expect(endRequestTargetCount).toBe(3);

      const endRequestSessionTokenExchangeTargetCount =
        await getTargetTableCount(
          conn,
          ApplicationDbTable.end_request_session_token_exchange
        );
      expect(endRequestSessionTokenExchangeTargetCount).toBe(2);

      const endRequestAuthServerTargetCount = await getTargetTableCount(
        conn,
        ApplicationDbTable.end_request_auth_server
      );
      expect(endRequestAuthServerTargetCount).toBe(1);
    });

    it("should throw a parsing error when encountering a kafka message with a null value", async () => {
      await expect(async () => {
        await handleMessages(
          [{ value: null } as unknown as KafkaMessage],
          dbContext,
          fileManager,
          genericLogger
        );
      }).rejects.toThrow();
    });
  });
});
