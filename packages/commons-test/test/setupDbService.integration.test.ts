import { describe, expect, it, vi, afterAll } from "vitest";
import { setupStagingTablesError } from "pagopa-interop-kpi-models";
import { setupDbServiceBuilder } from "pagopa-interop-kpi-commons";
import { dbContext, getTablesByName } from "./utils.js";

describe("Setup DB Service tests for all schemas", () => {
  afterAll(() => {
    vi.restoreAllMocks();
  });
  const { conn } = dbContext;
  const jwtConfig = { mergeTableSuffix: "_staging", dbSchemaName: "jwt" };
  const jwtTables = ["generated_token_audit", "client_assertion_audit"];
  const jwtService = setupDbServiceBuilder(conn, jwtConfig);

  it("should create staging tables successfully for infra schema", async () => {
    await jwtService.setupStagingTables(jwtTables);

    const expectedTables = jwtTables.map(
      (t) => `${t}${jwtConfig.mergeTableSuffix}`
    );
    const result = await getTablesByName(conn, expectedTables);
    expect(result.length).toBe(expectedTables.length);
    const createdTableNames = result.map((row) => row.tablename);
    expectedTables.forEach((table) => {
      expect(createdTableNames).toContain(table);
    });
  });

  it("should throw an error if database query fails for jwt schema", async () => {
    const mockQueryError = new Error("getaddrinfo ENOTFOUND 127.0.0.1");
    vi.spyOn(conn, "query").mockRejectedValue(mockQueryError);

    await expect(jwtService.setupStagingTables(jwtTables)).rejects.toThrowError(
      setupStagingTablesError(mockQueryError)
    );
  });
});
