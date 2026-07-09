> 🎯 **Decision in one line:**
>
> Build **omazifier** — a build-time, config-driven system that composes market-agnostic web
> components into per-market Next.js apps from a single, versioned TypeScript composition file —
> starting **frontend-only**, with a **parallel BFF market-skeleton track** done now while the BFF
> is still one endpoint deep. Architect it so a future move from build-time to runtime is a
> loader swap, not a rewrite.

---

## Context

**Problem:**

- `web-monorepo` is replacing Shopify Liquid themes with per-market Next.js apps, but the only
  pattern today is *clone-the-app-per-market* (`offers-uk` exists; `offers-de` does **not** yet in
  this branch — it's documented as "copy `offers-uk` and swap config"). Duplication is about to
  multiply across markets **and** surfaces.
- Market divergence is scattered — app bootstrap files (`api.ts`, `sanity.ts`, `analytics.ts`),
  env vars, Nx `market:` tags — with **no single place that defines what a market app *is***.
- The BFF has the same disease one tier down: `omaze-web-bff-uk` hardcodes UK specifics
  (`Europe/London`, hand-maintained UK bank-holiday set, GBP pence, UK offer matrix + Neal
  segments). Adding a market means cloning it too.

**Goals:**

- A **market-agnostic component ("block") library** — usage-named, never market-named — built on
  `pixl-design-system`.
- A **single declarative composition file** that fully defines a market app's *shape* and *wiring*,
  and drives its deployment.
- Make "add/change a market" a **config change** (engineer-authored now, UI-authored later) instead
  of a manual clone; eliminate copy-per-market drift.
- Keep the path from **build-time → runtime** open without a rewrite.

**Constraints:** *(time, cost, compliance, vendor, legacy, scale)*

- **Engineers-first**: the file is a PR-reviewed, version-controlled artifact. A web UI is a *later*
  phase but must not be precluded.
- Must fit the existing stack: **Nx + pnpm, Next.js 15 (App Router, SSR), CDK + OpenNext, Zod,
  Sanity (per-market datasets), PostHog**.
- **Build-time for v1**; per-app deployment topology retained (one Lambda app per market).
- **Regulatory divergence** (UK vs DE gambling regimes — the `regulated`/`unregulated` framing)
  looms: schema must be forward-compatible for a policy layer, but **enforcement is out of v1**.
- The BFF is per-market and UK-hardcoded; a real DE launch needs BFF work that is **out of
  omazifier's critical path**.
- Composed apps must hold **Core-Web-Vitals / SSR parity** with the Liquid theme they replace.

**Assumptions:** *(we believe these are true)*

- `offers-de` is still hypothetical in this branch — we are **pre-empting** duplication, not
  unwinding a large estate. *(Open question: does it exist on `main`/elsewhere?)*
- The BFF is **early** (one real web endpoint: `offers`; mobile BFF is an empty stub) — the cheapest
  moment to establish market-agnostic conventions.
- **Content** (copy/prices/images) stays in **Sanity at runtime**; the file wires *which dataset*,
  never the content itself.
- **DE's offer domain is not yet specified** — building a "generic" offers domain now would be
  speculative generality and likely wrong.

---

## Options

> 🅾️ **Do nothing / status quo**
>
> - **Summary:** Keep cloning a Next.js app per market; keep market differences scattered across
>   bootstrap/env; clone the BFF per market as new endpoints arrive.
> - **Pros:** No upfront investment; familiar; unblocks a single next market fastest in isolation.
> - **Cons / risks:** Duplication compounds as *markets × surfaces*; behavioural drift between
>   near-identical apps; no single source of market truth; the "launch from a UI" vision becomes
>   impossible; BFF debt grows with every endpoint added under the clone pattern.

> 1️⃣ **Build-time composition, frontend-only, BFF skeleton in parallel** *(chosen)*
>
> - **Summary:** A market-agnostic block library + a TypeScript composition file (Zod-validated,
>   JSON-serialisable) resolved **at build** into a per-market Next.js app, deployed via the existing
>   CDK + OpenNext pipeline. A **separate parallel track** parameterises the BFF now while it's cheap.
> - **Pros:** Fits current architecture with least disruption; smallest *safe* v1; **reversible** to
>   runtime later (swap the loader, reuse resolve/render core); type-safe authoring; surfaces the BFF
>   gap via a declared contract; establishes conventions while there's almost nothing to migrate.
> - **Cons / risks:** Requires discipline (no hand-edited generated source; pure config-driven
>   components); self-registration needs a generated types manifest + glob loader; two tracks to
>   coordinate; the flat layout model limits arrangement (mitigated by usage-named blocks).

> 2️⃣ **Runtime interpretation / multi-tenant now**
>
> - **Summary:** One shared runtime reads config live; config changes go live without a deploy;
>   a single multi-tenant deployment serves all markets.
> - **Pros:** Closest to the "launch a market from a UI" endgame; no per-market builds.
> - **Cons / risks:** Large architectural shift (multi-tenant CDK, domains, IAM, caching,
>   observability); live-config blast radius; premature for engineers-first; deep runtime trees are
>   harder to reason about and test. *(Deferred, not discarded — Option 1 keeps this reachable.)*

> 3️⃣ **All-in: omazifier v1 also makes the BFF fully market-agnostic (incl. a generic offers domain)**
>
> - **Summary:** One combined migration across both tiers, including a DE-capable generic offers
>   domain.
> - **Pros:** One story; both tiers consistent from day one.
> - **Cons / risks:** Couples two hard migrations; **invents the DE domain speculatively** with no
>   requirements; delays everything; high risk of wrong abstractions baked in early.

---

## Decision (what are we doing?)

> 📌 **We will:**
>
> Build **Option 1** — a build-time, config-driven composition system for `web-monorepo`, delivered
> across three sequenced tracks (block library → composition schema → omazifier tool), with a
> **fourth parallel track** that establishes the market-agnostic skeleton in the BFF now. Architect
> every layer so the eventual build-time → runtime move is additive.

- **What changes:**
  - New **block library**: market-agnostic, usage-named blocks built on `pixl-design-system`, each
    declaring a Zod config schema and self-registering via `registerBlock(...)`.
  - New **composition schema**: a TypeScript `defineMarketApp()` file (Zod-validated) that owns
    market identity/wiring **and** pages → **a flat ordered block list per page** → per-block
    config + data bindings; carries a `version`; declares its BFF contract.
  - New **omazifier tool**: `validate → resolve (pure) → deploy` via the existing CDK+OpenNext
    pipeline (reading market identity from the file); plus **local preview**.
  - **BFF (parallel):** deployment parameterised (drop the `-uk` from stack/API/function names),
    market config extracted (timezone, currency, Shopify store, **holidays-as-data**), UK logic
    renamed as an explicit **`uk-offers` strategy** behind a generic endpoint boundary.
- **What stays the same:**
  - Next.js 15 SSR, **CDK + OpenNext per-app deployment**, Sanity content model (per-market datasets),
    PostHog analytics, Zod validation, Nx + pnpm.
  - The **UK offer domain logic itself** — renamed and clearly bounded, **not** genericised for a DE
    that isn't specified.
- **Interfaces / contracts affected:** *(APIs, events, schemas, SLAs)*
  - New **composition schema** (versioned, additive-only).
  - Per-block **Zod config schemas**, plus a uniform **block prop contract** `{ config, data, market }`
    — where `market` (`{ id, locale, currency, timezone }`) lets data-consuming blocks (e.g. the offers
    grid) format correctly without market branching. **Implemented:** `renderBlocks` passes `market`;
    `offer-grid` formats currency from `market.locale`/`market.currency`, and the app resolver no
    longer injects `locale` into the offers payload.
  - The composition file **declares the BFF data contract** it depends on (build fails if unmet).
  - BFF **deployment identifiers** change (stack/API/function names) as it's parameterised; Shopify
    integration contract unchanged.
- **Rollout plan:** *(phases, toggles, backout)*
  - **Phase 0:** block contract + registry + governance lint, behind an example/hardcoded composition.
  - **Phase 1:** convert the real `offers-uk` page into a composition file — first true consumer;
    prove **CWV parity** side-by-side before switching traffic.
  - **Phase 2:** the composition file becomes the template for the next market (a *file*, not a clone).
  - **Parallel:** BFF skeleton track lands independently.
  - **Backout:** keep the existing `offers-uk` app deployed until parity is proven; switch is a
    routing/deploy cutover, revertable by redeploying the prior app.
- **Scope:** *(services, domains, teams affected)*
  - Primary: `web-monorepo`. Parallel: `bff-monorepo` (skeleton only). Later/out-of-scope now:
    `mobile-app` (same idea, separate effort). Teams: web + BFF.

---

## Plan

- **Track 1 — Block library:** define the block contract (component + Zod config + `registerBlock`),
  where every block receives `{ config, data, market }` (`market` = locale/currency/timezone);
  establish usage-naming convention; add **governance lint** (no market in name; ≤ ~20 variation
  params, ~10 avg — counting behavioural variation only, not data/content).
- **Track 2 — Composition schema:** implement `defineMarketApp()` with serialisable descriptors
  (`block()`, `bind.bff()`, `bind.sanity()`, `env()`); `version` field + **additive-only** evolution;
  flat block list per page; Zod validation; **generated types-only manifest** + **glob loader**
  so authoring stays type-safe despite self-registration. *(Pressure-test finding: the manifest is
  a **required** part of the self-registration decision, not a nice-to-have — without it, runtime Zod
  still validates but the composition file is untyped at author time, losing the DX that motivated the
  TypeScript-config format.)*
- **Track 3 — Omazifier tool:** `validate` (schema, block ids, per-block config, resolvable bindings,
  BFF contract) → **pure `resolve`** (file → render tree via registry) → `deploy` (market identity →
  CDK+OpenNext) → **local preview** for authors.
- **First real slice:** express `offers-uk` as a composition file end-to-end; prove parity; promote to
  template.
- **Track 4 — BFF skeleton (parallel):** parameterise the stack; extract market config; holidays as
  data; rename UK logic as `uk-offers` strategy; leave DE domain unspecified.

---

## Operational impact

- **Monitoring / alerting:** Composed apps inherit New Relic + PostHog, **market-tagged**; build-time
  validation failures surface in CI as a hard gate.
- **Runbook / on-call:** "Add/change a market" runbook = edit file → PR → CI validate → deploy;
  rollback = revert the file / redeploy the prior app.
- **Data backfills / migrations:** None for data. **Schema** evolves via `version` + one-off codemods
  when a breaking change is genuinely needed. BFF rename may **orphan CloudWatch log groups**
  (known `RemovalPolicy.RETAIN` gotcha) — include a cleanup step.
- **Security:** **No secrets in the composition file** — it references names/URLs only; secrets stay in
  the deploy env; per-market least-privilege IAM unchanged.
- **Cost considerations:** Per-market Lambda footprint unchanged (still per-app). Marginal CI cost for
  validation + type generation. Avoids the compounding cost of *markets × surfaces* duplication.

---

## Open questions / pending decisions

- [ ] Where does this doc live, and which Jira ticket does it attach to? (no key yet)
- [x] **App-level shell / regions?** Resolved: a page is a **flat block list** (no named regions —
      `regions` was dropped as dead weight). Header/footer are app *chrome* in the shell; multi-slot
      layouts would be a layout block. Re-add regions only if a real multi-slot-positioned need appears.
- [ ] Exact **data-binding** mechanism in a block (server-component fetch vs. passed props) — align with
      the `api-client` server-only pattern. *(Pressure test used a platform-supplied `resolveBinding`
      — server fetch on web, fetch+fallback on RN — which worked; the open part is the production
      web SSR shape.)*
- [ ] Governance enforcement of the 20/10 budget: automated lint rule vs. review checklist for v1?
- [ ] When does the **regulatory policy layer** become required (tied to DE launch timing)?
- [x] Does the schema get **reused for `mobile-app`** later, or a variant? **Resolved: reused.** The
      same engine + schema render on RN via the shared thin library; only the block components, the
      app's shell/i18n/data, and the delivery substrate differ. See *Consumption model* below.
- [x] **`offers-de` reality**: **Resolved (checked against the repos).** No `offers-de` in
      `web-monorepo` — only `apps/offers-uk` (tagged `market:uk`); DE offers is today the
      `web-shopify-theme-de` Shopify storefront. So DE web is a *migration off Shopify into a headless
      Nx app*, not a wiring change. See *Landing in the real repos*.
- [ ] **Mobile OTA is a prerequisite, not a given.** `mobile-app` has `apps/uk` + `apps/de` over shared
      `packages/`, but **no `expo-updates`/EAS Update** (no channels, no `runtimeVersion`). The
      OTA-composition-update benefit requires standing that up first (add `expo-updates`, channel per
      market app, runtimeVersion policy, `eas update` in CI). Also: `apps/de` is a scaffold needing its
      own `eas.json` + store credentials. Sequence this before promising OTA delivery for mobile.
- [ ] BFF: confirm the **`uk-offers` strategy boundary** shape before renaming.

---

## Consumption model: thin library, app owns everything else

*How the consuming repos use omazifier — converged after the pressure test and implemented in the demo.*

**omazifier is a thin, framework-agnostic library** — no React, no data fetching, no translations, no
shell, no codegen, no cross-repo compilation. Its entire job is: **combine market-agnostic components
into a per-market component tree from composition files.** The dependency direction is
`app → omazifier`; each app runs it inside its own build and produces an in-memory tree, never files.

**Only the frontend repos consume it** — `web-monorepo` and `mobile-app`. The BFF is a *data* provider
(offers, translations, content); it does not import omazifier.

### What omazifier owns vs. what the app owns

| omazifier (library) | The app |
|---|---|
| `validateComposition`, `composePage`, `resolvePage`, `renderBlocks`, `defineRegistry`, `marketRoutes` | The **shell** (chrome + providers) |
| the composition schema + authoring (`defineMarketApp`, `block`, `bind`, `env`) | **translations** — entirely (bundle type, id lookup/interpolation, context/provider); blocks consume the *app's* `useTranslation` |
| `createElement` is *injected* by the app (core imports no React) | the **data source** — its `sources` table + the *shell/translations/behaviour* above |
| a **default `resolveBinding`** + `createBindingResolver(sources)` helper (opt-in) | — |

Omazifier knows *which* component goes *where* with *what* config/bindings. Everything about how a
component looks, fetches, and is wrapped is the app's business.

**One resolver for everything.** `composePage` resolves per-block bindings *and* app-level bindings
(`wiring.appData`, e.g. `{ translations: bind.translations() }`) through the **same** `resolveBinding`,
returning `{ page, appData }` — no bespoke `fetchTranslations`. The resolver machinery lives in
omazifier as **`createBindingResolver(sources)`**: dispatch by `$bind` → pick the endpoint by
`binding.request` → fetch the URL that endpoint builds (each builds its own from `app.wiring.bffUrl`,
so there's no separate base). `composePage`'s `resolveBinding` is **optional and
defaults to omazifier's `defaultResolveBinding`** (the demo's BFF resolver), so an app that uses the
standard endpoints passes nothing. A real app overrides it — `createBindingResolver(itsOwnSources)`
for its actual BFF (endpoints are genuinely app-specific), or a wrapper. Mobile does exactly that: it
passes `withOfflineFallback(defaultResolveBinding)` to add a DEMO-ONLY offline fallback. That wrapper is
a temporary **DEMO-ONLY export from the engine** (`omazifier/src/demo-fallback.ts`), parked there to
keep the demo apps uncluttered and to be removed later — it does not belong in the engine long-term.
omazifier stays blind: `translations` is as opaque as `bff`; the sources table + the app's context give
bindings meaning.

**Block prop contract:** `renderBlocks` passes each block `{ config, data, market }` — `config`
(validated knobs), `data` (resolved bindings), and `market` (`{ id, locale, currency, timezone }`).
`market` is explicit so market-aware blocks (e.g. currency formatting in `offer-grid`) read it
directly rather than piggybacking on the data payload.

### Each repo's omazifier surface: an `omazifier/` folder with two things

```
<app>/omazifier/
├─ markets/            the composition file(s), one per market (uk.ts, de.ts) — which blocks, configured how
└─ registry.ts         defineRegistry([{ id, configSchema, component }]) — the app's block contract
```

That folder is the **entire** declarative contract with omazifier. Everything else lives in normal app
code *outside* it:

```
<app>/contexts/i18n           app-owned translation, end to end (bundle type + translate + context)
<app>/contexts/nav            (mobile) app-owned in-app router context
<app>/components/AppShell      app-owned shell: provides translation context + chrome, wraps children
```
(No app-side data resolver: the apps use omazifier's `defaultResolveBinding`; mobile wraps it with the
engine's DEMO-ONLY `withOfflineFallback` for the offline demo. A real app would add its own `sources`
via `createBindingResolver`.)

The registry uses the **uniform `defineRegistry([...])`** contract — identical shape on web and mobile;
the only difference is that `component` is a DOM component (web) or an RN component (mobile). This
replaces per-file self-registration and dissolves the earlier web/mobile asymmetry.

### Mount point (thin) + delivery

The app orchestrates in ~a dozen lines: `const { page, appData } = await composePage(...)` (omazifier
combines blocks + resolves app-level data through the app's resolver) → `renderBlocks(…, createElement,
market)` → wrap in the app's `<AppShell>`, feeding `appData.translations` into its context.

| | Web | Mobile |
|---|---|---|
| Mount point | server route: `composePage` → `renderBlocks` → `<AppShell>` | screen: same, resolved in an effect |
| omazifier runs | request time (server) + hydrate | on device, at launch/navigation |
| Physical build | `next build` → OpenNext | EAS Build |
| Delivered as | Lambda + CloudFront (HTML) | native binary via app stores |
| A composition change ships by | **redeploy** (composition + blocks, atomically; CI-validated) | **EAS Update (OTA)** (composition + blocks, atomically; CI-validated) — no store review; instant rollback. *Target state — OTA isn't wired in `mobile-app` yet; see below.* |

Both ship the composition *alongside the blocks it references*, gated by `validate` in CI, so a
dangling block reference can never reach a device/server. OTA's native boundary: a block needing a new
**native module** still requires a store release + a bumped runtime version; pure-JS/RN blocks are
fully OTA-able.

### Why the asymmetry is gone

Both repos expose the same `omazifier/` folder (markets + `defineRegistry` registry) and orchestrate
with the same core calls. The only differences are the ones that *should* differ — the components
(DOM vs RN), the app's shell/i18n/data implementations, and the delivery substrate (server-rendered
Lambda vs on-device binary). The `"use client"` server-registration concern is handled by pairing
schemas with client-component references in the app's server-side `registry.ts`.

### Landing in the real repos (feasibility, checked against the repos)

Both target repos already ship **per-market deployables**, so omazifier lands on the existing grain
rather than reshaping it. The demo's `MARKET` env + `active-market` alias is a *single-app*
convenience only — the real repos have separate per-market projects, each importing its own
composition file directly, so no alias/`distDir` juggling is needed in production.

- **Web (`web-monorepo` — Nx + Next + OpenNext + CDK).** `apps/offers-uk` is an Nx app tagged
  `market:uk`, deployed by its own OpenNext build + CDK stack; the production CD workflow already has a
  per-app build/deploy block with the standing note *"add a build + deploy block for each app as new
  markets are introduced."* A new market = a sibling `offers-de` app + one CD block; the omazifier
  consumer shell (registry, `AppShell`, i18n) lives in `packages/` alongside the existing
  `design-system` / `api-client` / `sanity-client`, so each market app stays thin. **"Rebuild only the
  changed market" is free** via Nx `affected` (the demo's `dist/<market>` isolation is a hand-rolled
  version of it). *Gap:* DE offers isn't headless yet — it's the `web-shopify-theme-de` Shopify
  storefront — so enabling DE web is a **migration off Shopify**, not just wiring. UK is low-friction.
- **Mobile (`mobile-app` — Expo/RN monorepo).** `apps/uk` and `apps/de` already exist as separate Expo
  projects over shared `packages/` (including `packages/translations` — a ready home for strings-by-id).
  UK is fully EAS-wired for build + store submit; DE is a scaffold needing its own `eas.json` + store
  credentials. **Gap — the important one:** there is no `expo-updates` / EAS Update configured anywhere
  (no channels, no `runtimeVersion`). So omazifier's headline mobile benefit — pushing a composition
  change **OTA without a store release** — is a *prerequisite to build*, not a given: it needs
  `expo-updates` added, a channel per market app, a `runtimeVersion` policy, and `eas update` wired into
  CI. Until then, composition changes ride a normal `eas build` + store submit (works, but store-review
  latency — you lose omazifier's fastest feedback loop).

### Routing (implemented)

Routes live in the market files: `pages` is a list of `{ path, blocks }`, and `marketRoutes(app)`
lists the paths. The **app** does the routing; omazifier just resolves the page for a given path:

- **Web** — a catch-all route `app/[[...slug]]/page.tsx` turns the URL into a path and calls
  `composePage({ app, path })`, rendering only that page's blocks. The app is rooted at `/` for its one
  market: `/` → landing hero, `/offers` → the offer grid, `/draws/confirm` → the confirm step. Unknown
  paths → `notFound()`. The market is chosen at *build* time, not in the URL (demo: a `MARKET` env +
  `active-market` alias; real repos: a separate per-market app project — see *Landing in the real repos*).
- **Mobile** — the demo simulates routing with in-app state (`contexts/nav.tsx`): App holds `{ path, params }`,
  `navigate()` re-composes. Production would use expo-router screens; the block-level contract is the same.

Routing selects a **page** (a set of blocks), never an individual block. A block appears on a URL by
being placed on that page in the composition. The landing hero carries `links` (route + label id) and
renders nav links; the draw flow is three **routed** blocks — `draw-select` (`/draws`) →
`draw-confirm` (`/draws/confirm`) → `draw-success` (`/draws/success`) — navigating by link/route rather
than internal state.

---

## Appendix

**Layering**

```
pixl-design-system   →  presentational primitives (already market-agnostic)
   ↑ built on
app blocks           →  composable, config-driven, data-aware units (DOM or RN; own their behaviour)
   ↑ listed in <app>/omazifier/registry.ts via defineRegistry([{id, configSchema, component}])
composition file     →  which blocks, configured how, wired to which data, for which market
   ↑ combined by
omazifier (library)  →  validateComposition → composePage → renderBlocks(createElement injected)
   ↑ orchestrated + wrapped in shell/i18n/data by
web-monorepo (Lambda/CloudFront)  ·  mobile-app (native binary via EAS; OTA is target state)
```

**Composition file — shape (chosen: TypeScript, Zod-validated, JSON-serialisable)**

```ts
// markets/uk.ts
import { defineMarketApp, block, bind, env } from '@omaze/omazifier'

export default defineMarketApp({
  version: 1,
  market: { id: 'uk', locale: 'en-GB', currency: 'GBP', timezone: 'Europe/London' },
  wiring: {
    bffUrl: env('BFF_URL'),
    appData: { translations: bind.translations() },
  },
  pages: [{
    path: '/',
    blocks: [
      block('hero', { variant: 'campaign' }),
      block('regulated-offers', { layout: 'grid', columns: 3 }, {
        offers: bind.bff('offers'),
        copy:   bind.sanity('offersSection'),
      }),
      block('faq', {}),
    ],
  }],
})
// helpers return plain descriptors (env('X') -> { $env: 'X' }) so the file serialises to JSON
```

**Key evidence (BFF UK-coupling, for the parallel track)**

- `apps/omaze-web-bff-uk/src/functions/offers/timing/ukTime.ts:5` — `tz("Europe/London")`, `enGB`.
- `.../timing/offerWindow.ts:9-38` — hand-maintained England & Wales bank-holiday set; Fri/Sat/Sun +
  BH-Monday "live" window.
- `.../mappers/variantsAndDiscounts.ts:33-34` + README — prices in **pence**, keyed `${SKU}|${pence}`.
- `.../mappers/slot.ts:22` — checkout URL / UK Shopify discount-code conventions.
- `.../constants/offers.ts` — UK offer matrix (event × segment × offer#); Neal segments.
- `cdk/lib/omaze-web-bff-uk-stack.ts:31,47,52,58` + `cdk/bin/app.ts:17` — market baked into stack/API/
  function names.

**Decisions ledger (design choices settled during brainstorming)**

| Decision | Choice |
|---|---|
| Audience | Engineers first; PR-reviewed file; UI a later phase |
| Change model | Build-time now; runtime later = loader swap |
| Component split | Usage-named; ≤ ~20 / ~10 avg variation knobs (behavioural only) |
| String handling | **No raw display strings in composition files or config** — components get strings only from the translation service (by id) or are language-agnostic; config carries knobs only. Markets differ by config/bundle/binding, never language |
| Schema scope | Composition **+** market wiring; deployment reads identity from it |
| BFF boundary | Parallel skeleton track now; frontend declares BFF contract |
| File format | TypeScript config, Zod-validated, JSON-serialisable |
| Layout model | Flat ordered block list per page (no named regions, no nesting) |
| Registry | **Uniform `defineRegistry([{id, configSchema, component}])`** per repo (retires self-registration; see Consumption model) |
| Consumption | omazifier is a **thin library** (no React/data/i18n/shell/codegen). Each repo has an `omazifier/` folder = markets + registry; shell, translations, and data source are **app-owned** |
| Delivery | Web: redeploy (Lambda/CloudFront). Mobile: **EAS Update (OTA)**, composition + blocks atomic, CI-validated |
| Schema evolution | `version` field + additive-only; codemod for breaking changes |

**Pressure-test findings (local demo: `omazifier/demo/`)**

A runnable local demo validated the design against the real UK/DE offers divergence: a
React-free engine (`validate → resolve → render` via injected `createElement`), a Next.js web app,
an Expo/React-Native app, and a mock BFF — all driven by the same two composition files.

*Confirmed:*
- **Config is pure data** — a JSON round-trip test enforces it; a UI could read/write it later.
- **One engine + one schema render on web AND React Native** — only the block registry differs
  (DOM vs RN components). `React.createElement` works on both.
- **Flat block list per page** was sufficient (no named regions, no nesting — `regions` was later
  dropped as unused).
- **The split** (`open-entry` UK / `verified-entry` DE) modelled cleanly as two registry entries
  filling one slot position — no market-named blocks, no config gymnastics.
- **Validation** caught unknown block ids and bad per-block config with precise paths.
- **Multi-step flow as routed steps** — the draw flow is three separate blocks on their own routes
  (`draw-select` `/draws` → `draw-confirm` `/draws/confirm` → `draw-success` `/draws/success`), moving
  by link/route with the choice carried as a query/nav param. (An earlier iteration modelled it as one
  block with *internal* state-driven steps — also valid, and it keeps steps out of the registry; the
  demo now shows the routed variant since each step has a real URL.)
- **Deep-linkable nested content:** `terms` is one registered block; its nested "experience rules"
  carries a stable anchor id (`house-draw-rules`), and the `faq` block links straight to it. A
  sub-section is addressable/linkable across blocks without being a registry entry. (Web uses an
  anchor; native would navigate/scroll to the same target — the mock shows the link.)
- **Chrome vs block reuse:** the **Header/Footer** are app *chrome* — plain app components the shell
  renders on every route (not omazifier blocks, since they're identical everywhere). A **`charity-ad`**
  block is placed on both `/offers` and `/faq` via the composition — the same registered block reused
  across routes. Two distinct reuse mechanisms: shell chrome vs a composed block.

*Refinements folded back in (see above):*
- Block prop contract is **`{ config, data, market }`** — `market` (locale/currency/timezone/id) is
  passed explicitly; `offer-grid` formats currency from it and the resolver no longer smuggles
  `locale` into the data. **Implemented.**
- The **generated types manifest** is required, not optional, to keep author-time type-safety —
  **and** it must generate the **server-side registration** (schema ↔ component reference), because
  a `"use client"` block cannot self-register on the server (see below).

*Later finding — `"use client"` breaks self-registration on the web:* when text-bearing blocks
became client components (to read strings from React context), their top-level `registry.register()`
side-effect stopped running on the server, where `validate`/`resolve` need the registry. Fix:
register on the server via a dedicated module that pairs each server-safe Zod schema with a
(client) component reference; keep self-registration only where there is no server/client split
(React Native under Metro). Full write-up in **`omazifier-translation.md`**.

*Separate concern — string/translation resolution:* how display strings are centralised (BFF
endpoint → React context → id lookup) so that market differences are configuration, not language,
is documented separately in **`omazifier-translation.md`** to keep concerns apart.

*Demo caveat:* the RN app was bundle-verified headlessly with `jsEngine: "jsc"` (this environment's
`hermesc` rejects RN 0.81's internal private-field syntax — a toolchain quirk, not a design issue);
on-device rendering is a normal `expo start` away.
