import { describe, expect, it } from "vitest";
import { KafkaMessage } from "kafkajs";
import { kafkaMissingMessagesValue } from "pagopa-interop-kpi-models";
import { genericLogger } from "pagopa-interop-kpi-commons";
import { handleMessages } from "../src/handlers/messagesHandler.js";
import { config } from "../src/config/config.js";

describe("Messages Handler tests", () => {
  describe("processMessage", () => {
    it("missing kafka batch messages value should throw an error", async () => {
      const invalidBatchMessages = undefined as unknown as KafkaMessage[];

      await expect(
        handleMessages(invalidBatchMessages, genericLogger)
      ).rejects.toThrowError(kafkaMissingMessagesValue(config.kafkaTopic));
    });
  });
});
