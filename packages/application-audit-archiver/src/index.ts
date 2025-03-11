import { runConsumer } from "kafka-connector";
import { initFileManager } from "pagopa-interop-kpi-commons";
import { config } from "./config/config.js";
import { processMessage } from "./handler/messagesHandler.js";

const fileManager = initFileManager(config);

await runConsumer(config, [config.kafkaTopic], processMessage(fileManager));
