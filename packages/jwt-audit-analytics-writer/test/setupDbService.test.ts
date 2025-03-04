import { describe, expect, it, vi, afterAll } from "vitest";
import { JwtGeneratedDbTable } from "pagopa-interop-kpi-models";
import { config } from "../src/config/config.js";
import { setupDbServiceBuilder } from "../src/services/setupDbService.js";
import { setupStagingTablesError } from "../src/model/domain/errors.js";
import { getTablesByName, postgresDB, setupDbService } from "./utils.js";

describe("Setup DB Service tests", () => {
  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("setupStagingTables", () => {
    it("should create staging tables successfully", async () => {
      await setupDbService.setupStagingTables();

      const clientAssertionTableName = `${JwtGeneratedDbTable.client_assertion}${config.mergeTableSuffix}`;
      const generateTokenTableName = `${JwtGeneratedDbTable.generated_token}${config.mergeTableSuffix}`;

      const result = await getTablesByName(
        postgresDB,
        `${config.dbSchemaName}`,
        [clientAssertionTableName, generateTokenTableName]
      );

      expect(result.length).toBe(2);
      const tableNames = result.map((row) => row.table_name);
      expect(tableNames).toContain(clientAssertionTableName);
      expect(tableNames).toContain(generateTokenTableName);
    });

    it("should throw an error if database query fails", async () => {
      const setupDbService = setupDbServiceBuilder(postgresDB);
      const mockQueryError = new Error(`getaddrinfo ENOTFOUND 127.0.0.1`);

      vi.spyOn(postgresDB, "query").mockRejectedValue(mockQueryError);

      await expect(setupDbService.setupStagingTables()).rejects.toThrowError(
        setupStagingTablesError(mockQueryError)
      );
    });
  });
});
