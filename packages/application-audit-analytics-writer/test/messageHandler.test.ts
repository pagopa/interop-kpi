import { describe, expect, it } from "vitest";
import { EachMessagePayload } from "kafkajs";
import { kafkaMissingMessageValue } from "pagopa-interop-kpi-models";
import { processMessage } from "../src/handlers/messagesHandler.js";
import { config } from "../src/config/config.js";
import { dbService } from "./utils.js";

describe("Messages Handler tests", () => {
  describe("processMessage", () => {
    it("given invalid kafka message, method should throw an error", async () => {
      const invalidMessage = {} as EachMessagePayload;

      await expect(
        processMessage(dbService)(invalidMessage)
      ).rejects.toThrowError(kafkaMissingMessageValue(config.kafkaTopic));
    });
  });
});
