import {
  CommonErrorCodes,
  InternalError,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { P, match } from "ts-pattern";
import { Logger } from "pagopa-interop-kpi-commons";
import { ErrorCodes } from "../model/domain/errors.js";

type LocalErrorCodes = ErrorCodes | CommonErrorCodes;

export const errorMapper = (
  error: unknown,
  logger: Logger
): InternalError<LocalErrorCodes> =>
  match<unknown, InternalError<LocalErrorCodes>>(error)
    .with(P.instanceOf(InternalError<LocalErrorCodes>), (error) => {
      logger.error(error);
      throw error;
    })
    .otherwise((error: unknown) => {
      logger.error(error);
      throw genericInternalError(`${error}`);
    });
