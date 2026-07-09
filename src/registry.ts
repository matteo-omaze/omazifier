import type { BlockDefinition, Registry } from "./types.js";

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
