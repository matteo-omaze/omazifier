import type { BlockDefinition, MarketApp, Registry } from "./types.js";

/** Create an empty per-platform registry. Prefer `defineRegistry([...])` for the common case. */
export function createRegistry<TComponent = unknown>(): Registry<TComponent> {
  const map = new Map<string, BlockDefinition<TComponent>>();
  return {
    register(def) {
      if (map.has(def.id)) {
        throw new Error(`Block "${def.id}" is already registered`);
      }
      map.set(def.id, def);
    },
    get: (id) => map.get(id),
    has: (id) => map.has(id),
    ids: () => [...map.keys()],
  };
}

/**
 * The UNIFORM registry contract: each consuming repo (web, mobile) exports exactly this — an
 * explicit list of `{ id, configSchema, component }`. Identical shape on every platform; the only
 * difference is what `component` is (a DOM component on web, an RN component on mobile). This
 * replaces per-file self-registration, which cannot run on the server for "use client" blocks.
 */
export function defineRegistry<TComponent = unknown>(
  defs: BlockDefinition<TComponent>[],
): Registry<TComponent> {
  const registry = createRegistry<TComponent>();
  for (const def of defs) registry.register(def);
  return registry;
}

/**
 * Returns the set of block IDs required by the given market app, including transitive
 * dependencies via `requires` declarations. Use this as the source of truth for pruning.
 */
export function requiredBlockIds(app: MarketApp, registry: Registry<any>): Set<string> {
  const ids = new Set(app.pages.flatMap((page) => page.blocks.map((b) => b.blockId)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of ids) {
      for (const req of registry.get(id)?.requires ?? []) {
        if (!ids.has(req.blockId)) { ids.add(req.blockId); changed = true; }
      }
    }
  }
  return ids;
}

/**
 * Returns a new registry containing only the blocks required by the given market app.
 * Includes transitive `requires` dependencies. The full registry is still needed to resolve
 * those dependencies — pass the complete one here.
 */
export function filterRegistry<TComponent>(
  registry: Registry<TComponent>,
  app: MarketApp,
): Registry<TComponent> {
  const ids = requiredBlockIds(app, registry);
  const filtered = createRegistry<TComponent>();
  for (const id of ids) {
    const def = registry.get(id);
    if (def) filtered.register(def);
  }
  return filtered;
}
