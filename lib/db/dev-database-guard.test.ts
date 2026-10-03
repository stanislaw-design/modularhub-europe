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
