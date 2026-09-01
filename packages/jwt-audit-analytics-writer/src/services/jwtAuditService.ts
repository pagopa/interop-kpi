/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { FileManager } from "pagopa-interop-kpi-commons";
import {
  JwtAuditService as CommonJwtAuditService,
  jwtAuditServiceBuilder as commonJwtAuditServiceBuilder,
  selectRecordsWithDpop,
} from "pagopa-interop-jwt-audit-commons";
import { JwtDbTable } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import {
  GeneratedTokenAuditDetails,
  tokenAuditSchema,
} from "../model/domain/models.js";
import { clientAssertionMapping } from "../repositories/clientAssertion.repository.js";
import { dpopMapping } from "../repositories/dpop.repository.js";
import { generatedTokenMapping } from "../repositories/generatedToken.repository.js";
import { DBService } from "./dbService.js";

export const jwtAuditServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager
) =>
  commonJwtAuditServiceBuilder(
    dbService,
    fileManager,
    tokenAuditSchema,
    config,
    {
      generatedToken: {
        tableName: JwtDbTable.generated_token,
        mapping: generatedTokenMapping,
      },
      clientAssertion: {
        tableName: JwtDbTable.client_assertion,
        mapping: clientAssertionMapping,
      },
      dpop: {
        tableName: JwtDbTable.dpop,
        mapping: dpopMapping,
        selectRecords: selectRecordsWithDpop,
      },
    }
  );

export type JwtAuditService = CommonJwtAuditService<GeneratedTokenAuditDetails>;
