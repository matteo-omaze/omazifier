import { test } from "node:test";
import assert from "node:assert/strict";
import { block, bind, env, defineMarketApp } from "./authoring.js";
import { composePage, CompositionError, marketRoutes } from "./compose.js";
import { testRegistry } from "./testkit.js";

const registry = testRegistry();

function app(entry: ReturnType<typeof block>) {
  return defineMarketApp({
    version: 1,
    market: { id: "uk", locale: "en-GB", currency: "GBP", timezone: "Europe/London" },
    wiring: { bffUrl: env("BFF_URL") },
    pages: [
      {
        path: "/",
        blocks: [block("hero", { heading: "Win a house" }), entry],
      },
    ],
  });
}

test("composePage validates then resolves into a component tree", async () => {
  const { page } = await composePage({
    app: app(block("open-entry", { postalAddress: "PO Box 1" })),
    registry,
    resolveBinding: () => ({ ok: true }),
  });
  assert.equal(page.blocks[0].component, "HeroComponent");
  assert.equal(page.blocks[1].component, "OpenEntryComponent");
});

test("composePage resolves app-level appData bindings via the same resolver", async () => {
  const withAppData = defineMarketApp({
    version: 1,
    market: { id: "uk", locale: "en-GB", currency: "GBP", timezone: "Europe/London" },
    wiring: { bffUrl: env("BFF_URL"), appData: { translations: bind.translations() } },
    pages: [{ path: "/", blocks: [block("hero", { heading: "Hi" })] }],
  });
  const { appData } = await composePage({
    app: withAppData,
    registry,
    // one resolver serves both per-block and app-level bindings, dispatched by $bind
    resolveBinding: (b) => (b.$bind === "translations" ? { "x.y": "hello" } : null),
  });
  assert.deepEqual(appData.translations, { "x.y": "hello" });
});

test("composePage throws CompositionError (with issues) on an invalid composition", async () => {
  await assert.rejects(
    () => composePage({ app: app(block("nope", {})), registry }),
    (err: unknown) => err instanceof CompositionError && err.issues.length > 0,
  );
});

test("marketRoutes lists the market's paths", () => {
  assert.deepEqual(marketRoutes(app(block("open-entry", { postalAddress: "x" }))), ["/"]);
});
