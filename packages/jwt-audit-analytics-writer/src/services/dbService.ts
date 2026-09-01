/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DBContext } from "pagopa-interop-kpi-commons";
import {
  JwtAuditDBService,
  JwtAuditRepositoryBuilder,
  jwtAuditDbServiceBuilder,
} from "pagopa-interop-jwt-audit-commons";
import { clientAssertionRepository } from "../repositories/clientAssertion.repository.js";
import { generatedTokenRepository } from "../repositories/generatedToken.repository.js";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";
import { dpopRepository } from "../repositories/dpop.repository.js";

export function dbServiceBuilder(
  db: DBContext,
  dpopRepo: JwtAuditRepositoryBuilder<GeneratedTokenAuditDetails> = dpopRepository,
  clientAssertionRepo: JwtAuditRepositoryBuilder<GeneratedTokenAuditDetails> = clientAssertionRepository,
  generatedTokenRepo: JwtAuditRepositoryBuilder<GeneratedTokenAuditDetails> = generatedTokenRepository
) {
  return jwtAuditDbServiceBuilder(
    db,
    dpopRepo,
    clientAssertionRepo,
    generatedTokenRepo
  );
}

export type DBService = JwtAuditDBService<GeneratedTokenAuditDetails>;
