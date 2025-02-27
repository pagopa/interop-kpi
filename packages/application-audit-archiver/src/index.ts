import { runConsumer } from "kafka-connector";
import { config } from "./config/config.js";
import { processMessage } from "./handler/messagesHandler.js";
import { initFileManager } from "pagopa-interop-kpi-commons";

const fileManager = initFileManager(config);

await runConsumer(config, [config.kafkaTopic], processMessage(fileManager));
