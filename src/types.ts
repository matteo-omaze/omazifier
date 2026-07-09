import type { ZodType } from "zod";

/**
 * The composition file is PURE SERIALISABLE DATA. Authoring helpers (see authoring.ts)
 * return plain descriptors so a future UI can read/write the same shape as JSON.
 */

/** A reference to an environment variable, resolved at load time. e.g. env('API_URL'). */
export type EnvRef = { $env: string };

/** Declarative data bindings — WHICH source to read, never inline data. Every binding names an
 * endpoint within its source via `request` (uniform across kinds), plus any params. The app's
 * resolver gives each `$bind` kind + `request` meaning; omazifier only carries the descriptor. */
export type BffBinding = { $bind: "bff"; request: string };
export type SanityBinding = { $bind: "sanity"; request: string; key: string };
export type TranslationsBinding = { $bind: "translations"; request: string };
export type DataBinding = BffBinding | SanityBinding | TranslationsBinding;

export type Bindings = Record<string, DataBinding>;

/** One block placed on a page: which block, how it's configured, what data it's wired to. */
export type BlockInstance = {
  blockId: string;
  config: Record<string, unknown>;
  bindings: Bindings;
};

/** A route: its path and a flat ordered list of blocks. No nesting. */
export type Page = {
  path: string;
  blocks: BlockInstance[];
};

export type Market = {
  id: string;
  locale: string;
  currency: string;
  timezone: string;
};

export type Wiring = {
  bffUrl: string | EnvRef;
  /** App-level bindings resolved once per page (not per block), e.g. `{ translations: bind.translations() }`.
   *  composePage resolves these and returns them as `appData` for the app to distribute (into contexts). */
  appData?: Record<string, DataBinding>;
};

/** The whole per-market app, fully described by one file. */
export type MarketApp = {
  version: number;
  market: Market;
  wiring: Wiring;
  pages: Page[];
};

/**
 * A block definition in a registry. The `component` is PLATFORM-SPECIFIC (a React DOM
 * component on web, a React Native component on mobile) — hence generic. The engine never
 * touches it beyond passing it through to the platform renderer.
 */
export type BlockDefinition<TComponent = unknown> = {
  id: string;
  configSchema: ZodType;
  component: TComponent;
};

/** Per-platform registry. Blocks self-register into it. */
export type Registry<TComponent = unknown> = {
  register: (def: BlockDefinition<TComponent>) => void;
  get: (id: string) => BlockDefinition<TComponent> | undefined;
  has: (id: string) => boolean;
  ids: () => string[];
};
