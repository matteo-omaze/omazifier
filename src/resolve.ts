import type {
  BlockInstance,
  DataBinding,
  EnvRef,
  MarketApp,
  Registry,
} from "./types.js";

/** A block resolved and ready to render: config parsed, data fetched, component attached. */
export type ResolvedBlock<TComponent = unknown> = {
  blockId: string;
  component: TComponent;
  config: Record<string, unknown>;
  data: Record<string, unknown>;
};

export type ResolvedPage<TComponent = unknown> = {
  path: string;
  blocks: ResolvedBlock<TComponent>[];
};

/** Platform supplies HOW to fetch a binding's data (server fetch on web, fetch on RN). */
export type BindingResolver = (
  binding: DataBinding,
  ctx: { app: MarketApp; key: string; blockId?: string },
) => unknown | Promise<unknown>;

export type ResolveOptions<TComponent = unknown> = {
  registry: Registry<TComponent>;
  resolveBinding?: BindingResolver;
  env?: Record<string, string | undefined>;
};

function isEnvRef(v: unknown): v is EnvRef {
  return typeof v === "object" && v !== null && "$env" in v;
}

/** Resolve a string-or-EnvRef against an env map. Throws on a missing referenced var. */
export function resolveEnv(
  value: string | EnvRef,
  env: Record<string, string | undefined> = {},
): string {
  if (isEnvRef(value)) {
    const resolved = env[value.$env];
    if (resolved == null) {
      throw new Error(`Missing env var "${value.$env}" referenced by the composition file`);
    }
    return resolved;
  }
  return value;
}

async function resolveBlock<TComponent>(
  instance: BlockInstance,
  app: MarketApp,
  opts: ResolveOptions<TComponent>,
): Promise<ResolvedBlock<TComponent>> {
  const def = opts.registry.get(instance.blockId);
  if (!def) throw new Error(`Unknown block "${instance.blockId}"`);

  const config = def.configSchema.parse(instance.config) as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  for (const [key, binding] of Object.entries(instance.bindings)) {
    data[key] = opts.resolveBinding
      ? await opts.resolveBinding(binding, { app, blockId: instance.blockId, key })
      : undefined;
  }

  return { blockId: instance.blockId, component: def.component, config, data };
}

/**
 * The PURE composition core: file -> resolved render tree. Identical whether it runs at build
 * time or (future) request time — swapping when/where the config is loaded is a loader change,
 * not a change here. This function is what both web and mobile call.
 */
export async function resolveComposition<TComponent>(
  app: MarketApp,
  opts: ResolveOptions<TComponent>,
): Promise<ResolvedPage<TComponent>[]> {
  const pages: ResolvedPage<TComponent>[] = [];
  for (const page of app.pages) {
    const blocks: ResolvedBlock<TComponent>[] = [];
    for (const instance of page.blocks) {
      blocks.push(await resolveBlock(instance, app, opts));
    }
    pages.push({ path: page.path, blocks });
  }
  return pages;
}

/** Convenience: resolve a single page by path. */
export async function resolvePage<TComponent>(
  app: MarketApp,
  path: string,
  opts: ResolveOptions<TComponent>,
): Promise<ResolvedPage<TComponent>> {
  const page = app.pages.find((p) => p.path === path);
  if (!page) throw new Error(`No page at path "${path}"`);
  const [resolved] = await resolveComposition({ ...app, pages: [page] }, opts);
  return resolved;
}
