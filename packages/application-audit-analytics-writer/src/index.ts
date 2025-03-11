import { runConsumer } from "kafka-connector";
import { config } from "./config/config.js";
import { processMessage } from "./handlers/messagesHandler.js";
import { DBService, dbServiceBuilder } from "./services/dbService.js";

const dbService: DBService = dbServiceBuilder();

await runConsumer(config, [config.kafkaTopic], processMessage(dbService));
