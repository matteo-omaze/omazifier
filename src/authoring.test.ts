import { test } from "node:test";
import assert from "node:assert/strict";
import { block, bind, env, defineMarketApp } from "./authoring.js";

test("block() returns a plain serialisable descriptor", () => {
  const b = block("hero", { heading: "Hi" }, { copy: bind.sanity("heroCopy") });
  assert.deepEqual(b, {
    blockId: "hero",
    config: { heading: "Hi" },
    bindings: { copy: { $bind: "sanity", request: "content", key: "heroCopy" } },
  });
  // No functions/closures anywhere — must survive a JSON round-trip (the future-UI promise).
  assert.deepEqual(JSON.parse(JSON.stringify(b)), b);
});

test("bind and env produce plain descriptors, not closures", () => {
  assert.deepEqual(bind.bff("GET /offers/{event}"), {
    $bind: "bff",
    request: "GET /offers/{event}",
  });
  assert.deepEqual(env("API_URL"), { $env: "API_URL" });
});

test("defineMarketApp is an identity that keeps the value plain data", () => {
  const app = defineMarketApp({
    version: 1,
    market: { id: "uk", locale: "en-GB", currency: "GBP", timezone: "Europe/London" },
    wiring: { bffUrl: env("API_URL") },
    pages: [{ path: "/", blocks: [block("hero", { heading: "Hi" })] }],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(app)), app);
});
