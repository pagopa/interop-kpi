/* eslint-disable @typescript-eslint/explicit-function-return-type */
import winston from "winston";
import { CorrelationId } from "pagopa-interop-kpi-models";
import { LoggerConfig } from "../config/loggerConfig.js";
import { bigIntReplacer, elapsedTime } from "./utils.js";

export type LoggerMetadata = {
  serviceName?: string;
  correlationId?: CorrelationId | null;
  messageId?: string;
};

export const parsedLoggerConfig = LoggerConfig.safeParse(process.env);
const config: LoggerConfig = parsedLoggerConfig.success
  ? parsedLoggerConfig.data
  : {
      logLevel: "info",
    };

const logFormat = (
  msg: string,
  timestamp: unknown,
  level: string,
  { serviceName, correlationId, messageId }: LoggerMetadata
) => {
  const serviceLogPart = serviceName ? `[${serviceName}]` : undefined;
  const messageLogPart = messageId ? `[MID=${messageId}]` : undefined;
  const correlationLogPart = correlationId
    ? `[CID=${correlationId}]`
    : undefined;

  const firstPart = [timestamp, level.toUpperCase(), serviceLogPart]
    .filter((e) => e !== undefined)
    .join(" ");

  const secondPart = [correlationLogPart, messageLogPart]
    .filter((e) => e !== undefined)
    .join(" ");

  return `${firstPart} - ${secondPart} ${msg}`.replace(/\s+/g, " ");
};

export const customFormat = () =>
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const clearMessage =
      typeof message === "object"
        ? JSON.stringify(message, bigIntReplacer)
        : message;
    const lines = `${clearMessage}`
      .toString()
      .split("\n")
      .map((line: string) =>
        logFormat(line, timestamp, level, meta.loggerMetadata as LoggerMetadata)
      );
    return lines.join("\n");
  });

const getLogger = () =>
  winston.createLogger({
    level: config.logLevel,
    transports: [
      new winston.transports.Console({
        stderrLevels: ["error"],
      }),
    ],
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.errors({ stack: true }),
      customFormat()
    ),
    silent: process.env.NODE_ENV === "test",
  });

const internalLoggerInstance = getLogger();

export const logger = (loggerMetadata: LoggerMetadata) => {
  const appendElapsedTime = (msg: string, startTime?: number): string => {
    if (startTime !== undefined && internalLoggerInstance.isDebugEnabled()) {
      return `${elapsedTime(startTime)} ${msg}`;
    }
    return msg;
  };

  return {
    isDebugEnabled: () => internalLoggerInstance.isDebugEnabled(),
    debug: (
      msg: (typeof internalLoggerInstance.debug.arguments)[0],
      startTime?: number
    ) =>
      internalLoggerInstance.debug(appendElapsedTime(msg, startTime), {
        loggerMetadata,
      }),
    info: (
      msg: (typeof internalLoggerInstance.info.arguments)[0],
      startTime?: number
    ) =>
      internalLoggerInstance.info(appendElapsedTime(msg, startTime), {
        loggerMetadata,
      }),
    warn: (
      msg: (typeof internalLoggerInstance.warn.arguments)[0],
      startTime?: number
    ) =>
      internalLoggerInstance.warn(appendElapsedTime(msg, startTime), {
        loggerMetadata,
      }),
    error: (
      msg: (typeof internalLoggerInstance.error.arguments)[0],
      startTime?: number
    ) =>
      internalLoggerInstance.error(appendElapsedTime(msg, startTime), {
        loggerMetadata,
      }),
  };
};

export type Logger = ReturnType<typeof logger>;

export const genericLogger = logger({});

if (!parsedLoggerConfig.success) {
  // eslint-disable-next-line no-console
  console.log(
    `No LOG_LEVEL env var: defaulting log level to "${config.logLevel}"`
  );
}
