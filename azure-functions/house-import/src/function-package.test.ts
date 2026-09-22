import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("house import function deployment package", () => {
  it("does not contain local file dependencies that create recursive Windows junctions", () => {
    const packageJson = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "azure-functions/house-import/package.json"),
        "utf8",
      ),
    ) as { dependencies?: Record<string, string> };

    expect(Object.values(packageJson.dependencies ?? {})).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^file:/)]),
    );
  });
});
