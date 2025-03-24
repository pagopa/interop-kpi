import { describe, it, expect, vi } from "vitest";
import { LoadBalancerLogTable } from "pagopa-interop-kpi-models";
import { setupDbServiceBuilder } from "../src/services/setupDbService.js";
import { config } from "../src/config/config.js";
import { setupStagingTablesError } from "../src/model/errors.js";
import { dbContext, getTablesByName } from "./utils.js";

describe("Setup DB Service tests", () => {
  const loadBalancerTableName = LoadBalancerLogTable.logs;
  const expectedTableName = `${loadBalancerTableName}${config.mergeTableSuffix}`;
  const { conn } = dbContext;
  const setupDbService = setupDbServiceBuilder(conn);

  it("should execute the create temporary table query successfully", async () => {
    await setupDbService.setupStagingTables();
    const result = (await getTablesByName(conn, expectedTableName)).map(
      (res) => res.tablename
    );
    console.log("RESULT", result);
    expect(result.length).toBe(1);
    expect(result).toContain(expectedTableName);
  });

  it("should throw a setupStagingTablesError if the query fails", async () => {
    const mockQueryError = new Error(`getaddrinfo ENOTFOUND 127.0.0.1`);
    vi.spyOn(conn, "query").mockRejectedValue(mockQueryError);

    await expect(setupDbService.setupStagingTables()).rejects.toThrowError(
      setupStagingTablesError(mockQueryError)
    );
  });
});
