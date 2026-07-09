import type {
  BlockInstance,
  Bindings,
  DataBinding,
  EnvRef,
  MarketApp,
} from "./types.js";

/**
 * Identity helper that gives authors full type-checking against the MarketApp shape while
 * keeping the value a plain object (so it serialises to JSON for a future UI).
 */
export function defineMarketApp(app: MarketApp): MarketApp {
  return app;
}

/** Place a block: block('regulated-offers', { layout: 'grid' }, { offers: bind.bff(...) }). */
export function block(
  blockId: string,
  config: Record<string, unknown> = {},
  bindings: Bindings = {},
): BlockInstance {
  return { blockId, config, bindings };
}

/** Data-binding descriptors — plain data, resolved later by a platform-supplied resolver. */
export const bind = {
  bff(request: string): DataBinding {
    return { $bind: "bff", request };
  },
  sanity(key: string): DataBinding {
    return { $bind: "sanity", request: "content", key };
  },
  /** An app-level binding (declared in wiring.appData) — the app's resolver returns the bundle. */
  translations(): DataBinding {
    return { $bind: "translations", request: "bundle" };
  },
};

/** Reference an env var without inlining its value. Resolved at load. */
export function env(name: string): EnvRef {
  return { $env: name };
}
