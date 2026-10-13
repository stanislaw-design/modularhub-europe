import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
vi.mock("./client", () => ({ db: { execute } }));

// vitest.setup.ts already loads the real (unmocked) module once per test
// file, before this file's vi.mock above is registered. Module caching means
// a plain top-level import here would reuse that pre-bound instance and
// silently ignore the mock, so each test resets the registry and re-imports
// fresh, forcing dev-database-guard.ts to re-bind against the mocked client.
beforeEach(() => {
  vi.resetModules();
  execute.mockReset();
});

async function freshAssertDevDatabase() {
  const { assertDevDatabase } = await import("./dev-database-guard");
  return assertDevDatabase();
}

describe("assertDevDatabase", () => {
  it("resolves when connected to the dev project", async () => {
    execute.mockResolvedValueOnce({ rows: [{ project_id: "bold-tree-78265613" }] });

    await expect(freshAssertDevDatabase()).resolves.toBeUndefined();
  });

  it("throws when connected to any other project (e.g. production)", async () => {
    execute.mockResolvedValueOnce({ rows: [{ project_id: "spring-rain-58383710" }] });

    await expect(freshAssertDevDatabase()).rejects.toThrow(/spring-rain-58383710/);
  });

  it("throws when the GUC comes back empty", async () => {
    execute.mockResolvedValueOnce({ rows: [{ project_id: null }] });

    await expect(freshAssertDevDatabase()).rejects.toThrow(/unknown/);
  });
});

async function freshAssertDevOrStagingDatabase() {
  const { assertDevOrStagingDatabase } = await import("./dev-database-guard");
  return assertDevOrStagingDatabase();
}

describe("assertDevOrStagingDatabase (e2e)", () => {
  it("resolves for the dev project", async () => {
    execute.mockResolvedValueOnce({ rows: [{ project_id: "bold-tree-78265613", branch_id: "br-anything" }] });
    await expect(freshAssertDevOrStagingDatabase()).resolves.toBeUndefined();
  });

  it("resolves for the staging branch of the production project", async () => {
    execute.mockResolvedValueOnce({ rows: [{ project_id: "spring-rain-58383710", branch_id: "br-dawn-tree-b1n3f9lb" }] });
    await expect(freshAssertDevOrStagingDatabase()).resolves.toBeUndefined();
  });

  it("throws for the production branch of the production project", async () => {
    execute.mockResolvedValueOnce({ rows: [{ project_id: "spring-rain-58383710", branch_id: "br-production-main" }] });
    await expect(freshAssertDevOrStagingDatabase()).rejects.toThrow(/br-production-main/);
  });

  it("throws when the staging branch id appears under a different project", async () => {
    execute.mockResolvedValueOnce({ rows: [{ project_id: "some-other-project", branch_id: "br-dawn-tree-b1n3f9lb" }] });
    await expect(freshAssertDevOrStagingDatabase()).rejects.toThrow(/some-other-project/);
  });

  it("throws when the GUCs come back empty", async () => {
    execute.mockResolvedValueOnce({ rows: [{ project_id: null, branch_id: null }] });
    await expect(freshAssertDevOrStagingDatabase()).rejects.toThrow(/unknown/);
  });
});
