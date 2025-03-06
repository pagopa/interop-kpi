import {
  CommonErrorCodes,
  InternalError,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { P, match } from "ts-pattern";
import { Logger } from "pagopa-interop-kpi-commons";

type LocalErrorCodes = CommonErrorCodes;

export const errorMapper = (error: unknown, logger: Logger, message?: string) =>
  match<unknown, InternalError<LocalErrorCodes>>(error)
    .with(P.instanceOf(InternalError<LocalErrorCodes>), (error) => {
      logger.error(`${error}. Kafka message: ${message}`);
      throw error;
    })
    .otherwise((error: unknown) => {
      logger.error(`${error}. Kafka message: ${message}`);
      throw genericInternalError(`${error}`);
    });
