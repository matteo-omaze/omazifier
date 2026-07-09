import type { MarketApp, Registry } from "./types.js";
import { validateComposition, type ValidationIssue } from "./validate.js";
import { resolvePage, type ResolvedPage, type BindingResolver } from "./resolve.js";
import { defaultResolveBinding } from "./resolver.js";

/** Thrown by composePage when the market's composition doesn't satisfy the registry. */
export class CompositionError extends Error {
  readonly issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super(`Invalid composition:\n${JSON.stringify(issues, null, 2)}`);
    this.name = "CompositionError";
    this.issues = issues;
  }
}

export type ComposedPage = {
  /** The resolved component tree for the route (regions → blocks with config + data). */
  page: ResolvedPage;
  /** App-level data resolved from `wiring.appData` (e.g. `translations`) — the app distributes it. */
  appData: Record<string, unknown>;
};

/**
 * The whole of what omazifier does: take a market's composition + the app's registry and combine
 * them into a resolved component tree for one route, plus any app-level data. It does NOT own the
 * shell, translations, or providers — those are the app's concern.
 *
 * `resolveBinding` is optional: it defaults to omazifier's `defaultResolveBinding` (the demo's
 * fetch-based BFF resolver). A real app passes its own — built with `createBindingResolver(sources)`
 * for its actual BFF, or wrapped (e.g. to add an offline fallback). Both per-block bindings and
 * app-level `wiring.appData` bindings (e.g. `translations`) go through the SAME resolver.
 */
export async function composePage({
  app,
  path = "/",
  registry,
  resolveBinding = defaultResolveBinding,
}: {
  app: MarketApp;
  path?: string;
  registry: Registry<any>;
  resolveBinding?: BindingResolver;
}): Promise<ComposedPage> {
  const result = validateComposition(app, registry);
  if (!result.ok) throw new CompositionError(result.issues);

  const [page, appData] = await Promise.all([
    resolvePage(result.app, path, { registry, resolveBinding }),
    resolveAppData(result.app, resolveBinding),
  ]);
  return { page, appData };
}

async function resolveAppData(
  app: MarketApp,
  resolveBinding?: BindingResolver,
): Promise<Record<string, unknown>> {
  const entries = Object.entries(app.wiring.appData ?? {});
  const resolved: Record<string, unknown> = {};
  await Promise.all(
    entries.map(async ([name, binding]) => {
      resolved[name] = resolveBinding ? await resolveBinding(binding, { app, key: name }) : undefined;
    }),
  );
  return resolved;
}

/** The routes a market defines — apps use this to wire their router / decide availability. */
export function marketRoutes(app: MarketApp): string[] {
  return app.pages.map((page) => page.path);
}
