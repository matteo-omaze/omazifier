import { test } from "node:test";
import assert from "node:assert/strict";
import { block, bind, env, defineMarketApp } from "./authoring.js";
import { resolveComposition, resolveEnv } from "./resolve.js";
import { testRegistry } from "./testkit.js";
import type { MarketApp } from "./types.js";

const registry = testRegistry();

function marketApp(id: string, entryBlock: ReturnType<typeof block>): MarketApp {
  return defineMarketApp({
    version: 1,
    market: { id, locale: "xx", currency: "GBP", timezone: "UTC" },
    wiring: { bffUrl: env("API_URL") },
    pages: [
      {
        path: "/",
        blocks: [
          block("hero", { heading: "Win a house" }),
          block("offer-grid", {}, { offers: bind.bff("GET /offers/{event}") }),
          entryBlock,
        ],
      },
    ],
  });
}

test("resolve applies each block's config schema (defaults + coercion)", async () => {
  const [page] = await resolveComposition(marketApp("uk", block("open-entry", { postalAddress: "PO Box 1" })), {
    registry,
  });
  const [hero, grid] = page.blocks;
  assert.equal(hero.config.variant, "plain"); // default filled in
  assert.equal(grid.config.columns, 3); // default filled in
});

test("resolve wires binding data via the platform-supplied resolver", async () => {
  const [page] = await resolveComposition(
    marketApp("uk", block("open-entry", { postalAddress: "PO Box 1" })),
    {
      registry,
      resolveBinding: (binding) =>
        binding.$bind === "bff" ? [{ price: 1000 }, { price: 2000 }] : null,
    },
  );
  const grid = page.blocks[1];
  assert.deepEqual(grid.data.offers, [{ price: 1000 }, { price: 2000 }]);
});

test("THE SPLIT: same page shape, market swaps entry-route block -> different component", async () => {
  const [uk] = await resolveComposition(marketApp("uk", block("open-entry", { postalAddress: "PO Box 1" })), {
    registry,
  });
  const [de] = await resolveComposition(marketApp("de", block("verified-entry", { provider: "schufa" })), {
    registry,
  });

  const ukEntry = uk.blocks[2];
  const deEntry = de.blocks[2];

  // Shared blocks resolve to the same components across markets...
  assert.equal(uk.blocks[0].component, de.blocks[0].component);
  // ...but the entry-route slot resolves to two DIFFERENT usage-named components.
  assert.equal(ukEntry.component, "OpenEntryComponent");
  assert.equal(deEntry.component, "VerifiedEntryComponent");
  assert.notEqual(ukEntry.component, deEntry.component);
});

test("resolveEnv reads env refs and throws on a missing var", () => {
  assert.equal(resolveEnv({ $env: "API_URL" }, { API_URL: "http://x" }), "http://x");
  assert.equal(resolveEnv("http://literal"), "http://literal");
  assert.throws(() => resolveEnv({ $env: "NOPE" }, {}), /Missing env var "NOPE"/);
});
