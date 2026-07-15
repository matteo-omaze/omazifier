# omazifier

A config-driven composition engine that assembles **per-market apps** from **market-agnostic blocks** — on web and mobile, from the same schema and the same pipeline. Framework-agnostic: no React import, no translations, no shell.

See `omazifier-design.md` for the full design write-up and `adr-omazifier-composer-engine.txt` for the decision record.

## Core idea

Every market is described by a single **composition file** (`MarketApp`): which blocks appear on which pages, what config each block gets, and what data to fetch. The engine validates, resolves, and renders it — the same way on web and mobile. Only the block registry differs (DOM components vs React Native components).

```
MarketApp (composition file)        Registry (platform block library)
  market: { id, locale, ... }         "hero"           → HeroComponent + configSchema
  wiring: { bffUrl, appData }         "draw/select"    → DrawSelectComponent + requires[...]
  pages:                              "draw/confirm"   → DrawConfirmComponent
    /          → [block("hero", ...)]  "draw/success"   → DrawSuccessComponent
    /draws     → [block("draw/select", ...)]   ← requires auto-mounts /draws/confirm + /draws/success
    /faq       → [block("faq", ...), block("charity-ad", {})]
    /entry     → [block("open-entry", {})]     ← UK; DE uses "verified-entry" instead
```

## Key types (`src/types.ts`)

| Type | What it is |
|------|-----------|
| `MarketApp` | The full per-market composition — pure serialisable data, no imports |
| `BlockInstance` | One block placed on a page: `{ blockId, config, bindings }` |
| `Page` | One route: `{ path, blocks[] }` |
| `BlockDefinition` | Registry entry: `{ id, configSchema, component, requires? }` |
| `BlockRequires` | A sibling page to auto-mount: `{ blockId, subPath }` |
| `DataBinding` | Where to fetch data: `bff(request)`, `sanity(key)`, or `translations()` |

## Authoring API (`src/authoring.ts`)

```ts
import { defineMarketApp, block, bind, env, expandRequires } from "omazifier";

defineMarketApp({ version, market, wiring, pages })  // identity helper — gives type-checking
block("draw/select", config, bindings)               // place a block on a page
bind.bff("offers")                                   // fetch from BFF endpoint "offers"
bind.sanity("offersFaq")                             // fetch from Sanity dataset key
bind.translations()                                  // fetch the market's translation bundle
env("BFF_URL")                                       // reference an env var (resolved at load)
expandRequires(app, registry)                        // expand `requires` into extra pages
```

`expandRequires` is called automatically inside `composePage` and `marketRoutes` — consuming apps don't need to call it directly.

## Block dependencies (`requires`)

A block can declare that it must always be accompanied by sibling pages:

```ts
// In the registry:
{
  id: "draw/select",
  configSchema: drawSelectConfig,
  component: DrawSelect,
  requires: [
    { blockId: "draw/confirm", subPath: "/confirm" },
    { blockId: "draw/success", subPath: "/success" },
  ],
}
```

When `draw/select` is placed at `/draws`, the engine automatically mounts `draw/confirm` at `/draws/confirm` and `draw/success` at `/draws/success`. The market config only declares the root:

```ts
{ path: "/draws", blocks: [block("draw/select", {}, { offers: bind.bff("offers") })] }
// /draws/confirm and /draws/success are mounted automatically
```

Pages already declared in the composition are never overridden.

## Pipeline

```
defineMarketApp(file)
  └── expandRequires(app, registry)   ← adds required sibling pages
        └── validateComposition(...)  ← checks block ids + per-block config schemas
              └── composePage(...)    ← fetches bindings, returns resolved block tree
                    └── renderBlocks(...)  ← platform-specific render (web or RN)
```

`composePage` is the main entry point. It runs the whole pipeline for one path:

```ts
const { page, appData } = await composePage({ app, path, registry, resolveBinding? });
renderBlocks(page.blocks, createElement, market);
```

`marketRoutes(app, registry)` returns all available paths including auto-expanded ones — pass it to your router's guard.

## Registry

```ts
// Each platform exports its own registry — same ids, different component implementations.
export const registry = defineRegistry([
  { id: "hero",         configSchema: heroConfig,        component: Hero },
  { id: "draw/select",  configSchema: drawSelectConfig,  component: DrawSelect, requires: [...] },
  { id: "draw/confirm", configSchema: drawConfirmConfig, component: DrawConfirm },
  // ...
]);
```

Block ids are arbitrary strings — `"draw/select"` is just a string; the slash is a naming convention to reflect the folder layout, not a hierarchy the engine understands.

## Data binding resolution

`composePage` accepts an optional `resolveBinding` function. Without it, it uses `defaultResolveBinding` — a fetch-based BFF resolver that works for the demo. A real app passes its own via `createBindingResolver(sources)`.

The binding resolver handles both per-block bindings (`bind.bff(...)`) and app-level bindings (`wiring.appData`, e.g. the translation bundle). Both go through the same resolver.

## Schema validation

`validateComposition` runs two passes:
1. Structural: the `MarketApp` shape against `marketAppSchema` (Zod).
2. Semantic: every `blockId` must exist in the registry; every block's `config` must pass its `configSchema`.

Errors surface with precise paths (`pages[2].blocks[0].config.provider`).

## Source layout

```
src/
  types.ts      — all shared types (MarketApp, BlockDefinition, BlockRequires, ...)
  authoring.ts  — defineMarketApp, block, bind, env, expandRequires
  schema.ts     — Zod schemas for structural validation
  validate.ts   — validateComposition (structural + semantic)
  resolve.ts    — resolveComposition / resolvePage (fetch bindings, attach components)
  resolver.ts   — createBindingResolver, defaultResolveBinding
  compose.ts    — composePage, marketRoutes
  render.ts     — renderBlocks (platform-agnostic via createElement)
  registry.ts   — createRegistry, defineRegistry
  index.ts      — public exports
```

## Running

```sh
npm install
npm run build   # tsc → dist/
npm test        # vitest — engine unit tests
```
