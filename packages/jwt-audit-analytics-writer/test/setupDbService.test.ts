import { describe, expect, it, vi, afterAll } from "vitest";
import { JwtDbTable } from "pagopa-interop-kpi-models";
import { config } from "../src/config/config.js";
import { setupStagingTablesError } from "../src/model/domain/errors.js";
import { dbContext, getTablesByName, setupDbService } from "./utils.js";

describe("Setup DB Service tests", () => {
  const { conn } = dbContext;

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("setupStagingTables", () => {
    it("should create staging tables successfully", async () => {
      await setupDbService.setupStagingTables();

      const clientAssertionTableName = `${JwtDbTable.client_assertion}${config.mergeTableSuffix}`;
      const generateTokenTableName = `${JwtDbTable.generated_token}${config.mergeTableSuffix}`;

      const result = await getTablesByName(conn, [
        clientAssertionTableName,
        generateTokenTableName,
      ]);

      expect(result.length).toBe(2);
      const tableNames = result.map((row) => row.tablename);
      expect(tableNames).toContain(clientAssertionTableName);
      expect(tableNames).toContain(generateTokenTableName);
    });

    it("should throw an error if database query fails", async () => {
      const mockQueryError = new Error(`getaddrinfo ENOTFOUND 127.0.0.1`);

      vi.spyOn(conn, "query").mockRejectedValue(mockQueryError);

      await expect(setupDbService.setupStagingTables()).rejects.toThrowError(
        setupStagingTablesError(mockQueryError)
      );
    });
  });
});
