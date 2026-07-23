import type { MarketApp } from "./types.js";
import { resolveEnv, type BindingResolver } from "./resolve.js";

// `fetch` is global in Node 18+ and React Native; type it locally so core needn't pull in DOM libs.
const httpFetch = (globalThis as { fetch?: (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }> })
  .fetch!;

/** A source's endpoints: request id → a full-URL builder. Each builds its own URL (typically from
 *  `app.wiring.bffUrl`), so there's no separate base — a source is free to point elsewhere later. */
export type Endpoints = Record<string, (app: MarketApp, binding: any) => string>;

/**
 * The generic, app-agnostic binding-resolution machinery: dispatch by `$bind` → pick the endpoint by
 * `binding.request` → fetch the URL that endpoint builds. omazifier stays blind to what any endpoint
 * means; a real app builds its own `sources` (its actual BFF). Reads the market from `ctx.app`.
 */
export function createBindingResolver(sources: Record<string, Endpoints>): BindingResolver {
  return async (binding, ctx) => {
    const build = sources[binding.$bind]?.[(binding as { request?: string }).request ?? ""];
    if (!build) return null;
    const res = await httpFetch(build(ctx.app, binding));
    if (!res.ok) throw new Error(`${binding.$bind} request failed: ${res.status}`);
    return res.json();
  };
}

// DEMO DEFAULT — the demo's mock-BFF endpoints; each builds its URL from `app.wiring.bffUrl`. Both
// demo apps hit the same server, so this one resolver serves both and `composePage` uses it when no
// `resolveBinding` is passed. A real product builds its own via `createBindingResolver` for its BFF(s).
const bffUrl = (app: MarketApp) =>
  resolveEnv(app.wiring.bffUrl, {
    BFF_URL:
      (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.BFF_URL ||
      "http://localhost:4000",
  });

export const defaultResolveBinding: BindingResolver = createBindingResolver({
  bff: { offers: (app) => `${bffUrl(app)}/offers?market=${app.market.id}` },
  sanity: { content: (app, b) => `${bffUrl(app)}/content/${app.market.id}/${b.key}` },
  translations: { bundle: (app) => `${bffUrl(app)}/translations/${app.market.id}` },
});
