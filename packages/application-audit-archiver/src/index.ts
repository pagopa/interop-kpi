import { runConsumer } from "kafka-connector";
import { config } from "./config/config.js";
import { processMessage } from "./handler/messagesHandler.js";

await runConsumer(config, [config.kafkaTopic], processMessage());
