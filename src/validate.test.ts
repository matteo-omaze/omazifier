import { test } from "node:test";
import assert from "node:assert/strict";
import { block, bind, env, defineMarketApp } from "./authoring.js";
import { validateComposition } from "./validate.js";
import { testRegistry } from "./testkit.js";

const registry = testRegistry();

function appWith(mainBlocks: ReturnType<typeof block>[]) {
  return defineMarketApp({
    version: 1,
    market: { id: "uk", locale: "en-GB", currency: "GBP", timezone: "Europe/London" },
    wiring: { bffUrl: env("API_URL") },
    pages: [{ path: "/", blocks: mainBlocks }],
  });
}

test("a well-formed composition validates", () => {
  const result = validateComposition(
    appWith([
      block("hero", { heading: "Win a house", variant: "campaign" }),
      block("offer-grid", { columns: 3 }, { offers: bind.bff("GET /offers/{event}") }),
      block("open-entry", { postalAddress: "PO Box 1, London" }),
    ]),
    registry,
  );
  assert.equal(result.ok, true);
});

test("an unknown block id is reported with its path", () => {
  const result = validateComposition(appWith([block("does-not-exist", {})]), registry);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.issues[0].path, /pages\[0\]\.blocks\[0\]\.blockId/);
  assert.match(result.issues[0].message, /Unknown block "does-not-exist"/);
});

test("bad block config is reported against that block's own schema", () => {
  // offer-grid allows columns 1..4; 9 must fail.
  const result = validateComposition(appWith([block("offer-grid", { columns: 9 })]), registry);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.issues[0].path, /config\.columns/);
});

test("a wrong schema version fails structural validation", () => {
  const bad = { ...appWith([]), version: 999 };
  const result = validateComposition(bad, registry);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.issues[0].path, /version/);
});

test("missing required config (heading on hero) fails", () => {
  const result = validateComposition(appWith([block("hero", { variant: "campaign" })]), registry);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((i) => /config\.heading/.test(i.path)));
});
