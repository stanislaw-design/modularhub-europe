import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await build({
  absWorkingDir: repositoryRoot,
  entryPoints: ["./azure-functions/house-import/src/function.ts"],
  outfile: "./azure-functions/house-import/dist/functions/house-import.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: true,
  tsconfig: path.join(repositoryRoot, "tsconfig.json"),
  external: [
    "@azure/functions",
    "@azure/functions-extensions-servicebus",
    "@azure/identity",
    "@azure/service-bus",
  ],
});
