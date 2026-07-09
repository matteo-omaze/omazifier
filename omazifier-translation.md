# omazifier — translation & string resolution

> This is a **separate concern** from the composition design (`omazifier-design.md`), documented on
> its own so the two don't tangle. Composition decides *which blocks, configured how*; translation
> decides *how display strings are resolved*. A block is defined once; its language is data.

## Problem

Display strings were hardcoded in three bad places:

1. **Inside components** — e.g. `"Enter now"`, `"No purchase necessary"` baked into JSX.
2. **In composition files as config** — e.g. `block("faq", { heading: "FAQs" })` vs `{ heading: "Häufige Fragen" }`.
3. **Duplicated per platform** — the same literals in web and React Native blocks.

This bloated components, made market differences look bigger than they are, and produced a real
bug: the DE offer grid rendered English chrome (`"Enter now"`, `"15 entries"`) because those
strings lived in the component, not the market's language data.

## Principle

> **Components and composition files reference string *ids*, never raw strings. The strings live in
> one place — the BFF — and are resolved per market at the edge.**

A direct consequence, and the real aim:

> **Differences between markets should be *configuration* (or genuinely different blocks), never
> language.** Once *all* strings are externalised (including the hero copy and the postal address),
> the UK and DE composition files become **identical** except market metadata/wiring and the
> entry-route block (the `open-entry` vs `verified-entry` regulatory split).

## Architecture

```
translations/<market>.json      ← the ONLY home for display strings (in mock-bff-monorepo)
        │  GET /translations/:market
        ▼
React app context (per market)   ← bundle fetched once, provided app-wide
        │  useTranslation().t(id, vars?)
        ▼
blocks reference ids only        ← t("offerGrid.cta"), t("offerGrid.entries", { count })
```

Translation semantics are **entirely app-owned** — omazifier resolves the translations *binding* like
any other (opaquely, into `appData`) but knows nothing about what it means. Three layers:

| Layer | Where | Responsibility |
|---|---|---|
| **String data** | `mock-bff-monorepo/translations/<market>.json` + `GET /translations/:market` | Owns every display string, keyed by id, per market. |
| **Fetch** | the app's `lib/data.ts` resolver, via an app-level binding | The market declares `wiring.appData: { translations: bind.translations() }`; `composePage` resolves it through the app's one table-driven `resolveBinding` (a `translations` row alongside `bff`/`sanity`) and returns it as `appData.translations`. No bespoke `fetchTranslations`. |
| **Resolution + delivery** | each app's `lib/i18n.tsx` — a local `translate(bundle, id, vars?)` + `TranslationProvider` + `useTranslation()` | id lookup + `{token}` interpolation (missing id → returns the id; missing var → leaves the token), plus the React context. The app feeds `appData.translations` into the provider. Each app owns its own copy (web-monorepo and mobile-app are separate repos). |

> omazifier used to ship a pure `translate` helper; it was **removed** to keep omazifier strictly about
> composing components. If a shared translate is ever wanted, it belongs in a separate i18n library,
> not in omazifier.

### Endpoint

`GET /translations/:market` returns a flat `{ id: string }` map. The `:market` path parameter is
guarded (`^[a-z]{2}$`) against path traversal. Bundles are **market-scoped**: `uk.json` carries the
ids UK renders (`openEntry.*`), `de.json` carries DE's (`verifiedEntry.*`), plus the shared ids
both use (`offerGrid.*`, `faq.heading`).

Example (`de.json`):

```json
{
  "offerGrid.heading": "Wähle deine Lose",
  "offerGrid.cta": "Jetzt teilnehmen",
  "offerGrid.entries": "{count} Lose",
  "faq.heading": "Häufige Fragen",
  "verifiedEntry.provider.schufa": "SCHUFA-Identitätsprüfung"
}
```

### Id naming

Dot-namespaced by block: `offerGrid.cta`, `faq.heading`, `verifiedEntry.provider.schufa`.
Interpolation uses `{token}` placeholders resolved from a `vars` object:
`t("offerGrid.entries", { count: 15 })` → `"15 entries"` / `"15 Lose"`.

## The hard rule — where a component's strings come from

**A component gets display strings ONLY from the translation service (by id), or it is
language-agnostic. Composition/market files and component config carry NO raw display strings** —
only behavioural knobs and ids. A component is always *market-aware* (it knows the locale, e.g. for
currency formatting) but never carries language.

Everything a block shows resolves through one of two channels:

- **Static display strings** — labels/chrome *and* market-specific copy (hero headline, tag, even the
  postal address). → a **translation id**, resolved from the bundle. These never appear inline in a
  market file. (The per-market bundle naturally carries market-specific *meaning*, not just language —
  the UK and DE `hero.heading` values differ in substance, and that's fine.)
- **Dynamic/list content** — data fetched at runtime (offers, FAQ items). → a **data binding**
  (`bind.bff` / `bind.sanity`) resolved by the *app's* data layer, never an inline string in the
  market file.
- **Config** — structural/behavioural knobs only: `variant`, `columns`, which KYC `provider`. No
  strings.

Result in the demo: the UK and DE market files are **identical** except market metadata/wiring and the
entry-route block (the genuine regulatory split). No language lives in a composition file.

### Data that carries labels → the data carries the *id*

Some display strings arrive as **data from the BFF** — e.g. an offer's `ribbon`
(`"Most popular"` / `"Beliebteste"`). These must not be raw text either. The BFF returns the
**id** (`ribbon: "offerGrid.ribbon.mostPopular"`) — a merchandising decision about *which* ribbon —
and the component resolves the text with `t(offer.ribbon)`. So the split holds even inside data:
**the payload decides *which* label (id); the translation bundle owns the *text*.** A nice
side-effect: the offers payloads for UK and DE now differ only in price/currency/URL — the ribbon
ids are identical.

## What changed in the demo

- **Engine:** knows nothing about translation *semantics*; it just resolves the `translations`
  binding (declared in `wiring.appData`) opaquely into `appData`, like any other binding.
- **BFF:** `translations/uk.json`, `translations/de.json`, and `GET /translations/:market`.
- **Web:** app-owned `lib/i18n.tsx` (its own `translate` + context + hook) and `lib/data.ts` (the
  table-driven resolver with a `translations` row); the market page reads `appData.translations` from
  `composePage` and feeds it into the app's `<AppShell>` (which provides the `TranslationProvider`).
  Blocks resolve strings by id via the *app's* `useTranslation`.
- **Mobile:** the same; its offline fallback (data + wrapper) is isolated in `lib/demo-fallback.ts`,
  clearly marked DEMO ONLY so reviewers see `lib/data.ts` as the production shape.
- **Composition files:** `offer-grid` and `faq` lost all string config and are now **identical**
  across `market.uk.ts` and `market.de.ts`.

## Finding: `"use client"` requires server-side registration on the web

Making the text-bearing blocks `"use client"` (needed for the context hook) exposed a real
interaction with block registration:

> A Next.js **Server Component importing a `"use client"` module gets a client *reference*** — the
> module's top-level side-effects **never run on the server**, where `validate`/`resolve` need the
> registry. So per-file self-registration can't populate the registry on the server.

**Resolution:** register explicitly, on the server, via the app's `omazifier/registry.ts`:

- `blocks/schemas.ts` — plain, server-safe Zod schemas (+ inferred config types).
- `blocks/*.tsx` — the components. Text-bearing ones are `"use client"` and only *export* their
  component; they never self-register.
- `<app>/omazifier/registry.ts` — a **server** module that `defineRegistry([...])`, pairing each
  server-safe schema with a component reference (a client-component reference for the `"use client"`
  blocks). This runs on the server when the page imports the registry.

This is exactly why the design settled on the **uniform `defineRegistry`** contract over per-file
self-registration. **Mobile is unaffected** (Metro has no server/client split), but it uses the same
explicit `defineRegistry` for uniformity.

## Simplifications (demo only — flag before productionising)

- No pluralisation rules (`{count} entries` is naïve); real i18n needs plural/gender via the market
  locale (e.g. `Intl.PluralRules` or ICU MessageFormat).
- Bundles are fetched uncached per request; production wants caching/CDN + versioning.
- No fallback-locale chain or missing-key reporting beyond "return the id".
- The bundle is fetched whole; a large app may want per-route/per-namespace splitting.
