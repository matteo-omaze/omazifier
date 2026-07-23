#!/usr/bin/env node
/**
 * omazifier-prune — generates a pruned registry for a single market.
 *
 * Usage (from the consuming app root):
 *   MARKET=uk npx omazifier-prune
 *
 * Options:
 *   --market <id>         Market to prune for (also read from MARKET env var)
 *   --registry <path>     Path to registry.ts (default: ./omazifier/registry.ts)
 *   --markets-dir <path>  Directory containing <market>.ts files (default: ./omazifier/markets)
 *   --output <path>       Output path (default: ./omazifier/registry.pruned.ts)
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    market: { type: "string" },
    registry: { type: "string", default: "./omazifier/registry.ts" },
    "markets-dir": { type: "string", default: "./omazifier/markets" },
    output: { type: "string", default: "./omazifier/registry.pruned.ts" },
  },
  strict: false,
});

const market = values.market ?? process.env.MARKET;
if (!market) throw new Error("--market <id> or MARKET env var required");

const cwd = process.cwd();
const binDir = dirname(fileURLToPath(import.meta.url));

// Serialise the market composition (TypeScript) via tsx
const dumpHelper = resolve(binDir, "dump-market.ts");
const marketFile = resolve(cwd, values["markets-dir"], `${market}.ts`);
const dumpResult = spawnSync("npx", ["tsx", dumpHelper, marketFile], {
  encoding: "utf-8",
  env: process.env,
});
if (dumpResult.status !== 0) {
  throw new Error(`Failed to load market "${market}":\n${dumpResult.stderr}`);
}
const app = JSON.parse(dumpResult.stdout);

// Parse registry.ts source to derive the manifest — no separate manifest file needed
const registryPath = resolve(cwd, values.registry);
const registrySource = readFileSync(registryPath, "utf-8");

const { parseRegistryManifest, generatePrunedRegistry } = await import("../dist/codegen.js");
const manifest = parseRegistryManifest(registrySource);

const source = generatePrunedRegistry(manifest, app);
const outPath = resolve(cwd, values.output);
writeFileSync(outPath, source);

const included = manifest.filter((e) => source.includes(`"${e.id}"`)).length;
const excluded = manifest.filter((e) => !source.includes(`"${e.id}"`)).map((e) => e.id);
console.log(
  `✓ ${outPath} — market "${market}": ${included}/${manifest.length} blocks` +
    (excluded.length ? ` (excluded: ${excluded.join(", ")})` : "")
);
