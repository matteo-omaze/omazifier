// omazifier — composer engine + config builder. Framework-agnostic (no React import).

export * from "./types.js";
export { defineMarketApp, block, bind, env, expandRequires } from "./authoring.js";
export {
  CURRENT_SCHEMA_VERSION,
  marketAppSchema,
  bindingSchema,
  blockInstanceSchema,
} from "./schema.js";
export { createRegistry, defineRegistry } from "./registry.js";
export { validateComposition } from "./validate.js";
export type { ValidationIssue, ValidationResult } from "./validate.js";
export {
  resolveComposition,
  resolvePage,
  resolveEnv,
} from "./resolve.js";
export type {
  ResolvedBlock,
  ResolvedPage,
  BindingResolver,
  ResolveOptions,
} from "./resolve.js";
export { renderBlocks } from "./render.js";
export type { CreateElement } from "./render.js";
export { composePage, CompositionError, marketRoutes } from "./compose.js";
export type { ComposedPage } from "./compose.js";
export { createBindingResolver, defaultResolveBinding } from "./resolver.js";
export type { Endpoints } from "./resolver.js";

// ⚠️ DEMO ONLY — TEMPORARY. Remove when the demo apps are retired (see demo-fallback.ts).
export { withOfflineFallback } from "./demo-fallback.js";
