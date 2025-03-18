import { describe, expect, it } from "vitest";
import { KafkaMessage } from "kafkajs";
import { genericLogger } from "pagopa-interop-kpi-commons";
import { handleMessages } from "../src/handlers/messagesHandler.js";
import { dbContext } from "./utils.js";

describe("Messages Handler tests", () => {
  describe("handleMessages", () => {
    it("processing empty messages from kafka should not throw error", async () => {
      const emptyBatchMessages: KafkaMessage[] = [];

      await expect(
        handleMessages(emptyBatchMessages, dbContext, genericLogger)
      ).resolves.toBeUndefined();
    });
  });
});
