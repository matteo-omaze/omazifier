import type {
  BlockInstance,
  Bindings,
  DataBinding,
  EnvRef,
  MarketApp,
  Page,
  Registry,
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

/**
 * Expand `requires` declarations: for every block in `app` that has `requires` entries in the
 * registry, auto-mount the required blocks at `basePath + subPath`. Pages already declared in
 * `app` are never overridden. This is what lets a market config declare only `draw/select` at
 * `/draws` and get `/draws/confirm` and `/draws/success` for free.
 */
export function expandRequires(app: MarketApp, registry: Registry): MarketApp {
  const extra: Page[] = [];
  const allPaths = new Set(app.pages.map((p) => p.path));

  for (const page of app.pages) {
    for (const inst of page.blocks) {
      const def = registry.get(inst.blockId);
      if (!def?.requires) continue;
      for (const req of def.requires) {
        const path = `${page.path}${req.subPath}`;
        if (allPaths.has(path)) continue;
        allPaths.add(path);
        extra.push({ path, blocks: [{ blockId: req.blockId, config: {}, bindings: {} }] });
      }
    }
  }

  return extra.length ? { ...app, pages: [...app.pages, ...extra] } : app;
}
