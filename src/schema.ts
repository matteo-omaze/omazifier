import { z } from "zod";

/** The schema version this engine understands. Additive-only evolution; bump only on a break. */
export const CURRENT_SCHEMA_VERSION = 1;

export const envRefSchema = z.object({ $env: z.string() });

export const bindingSchema = z.union([
  z.object({ $bind: z.literal("bff"), request: z.string() }),
  z.object({ $bind: z.literal("sanity"), request: z.string(), key: z.string() }),
  z.object({ $bind: z.literal("translations"), request: z.string() }),
]);

export const blockInstanceSchema = z.object({
  blockId: z.string(),
  config: z.record(z.unknown()).default({}),
  bindings: z.record(bindingSchema).default({}),
});

export const pageSchema = z.object({
  path: z.string(),
  blocks: z.array(blockInstanceSchema),
});

export const marketSchema = z.object({
  id: z.string(),
  locale: z.string(),
  currency: z.string(),
  timezone: z.string(),
});

export const wiringSchema = z.object({
  bffUrl: z.union([z.string(), envRefSchema]),
  appData: z.record(bindingSchema).optional(),
});

/**
 * Structural schema for a composition file. Note: per-block `config` is validated separately
 * against each block's own schema (see validate.ts) — here it's just an opaque record, because
 * the engine can't know a block's config shape without the registry.
 */
export const marketAppSchema = z.object({
  version: z.literal(CURRENT_SCHEMA_VERSION),
  market: marketSchema,
  wiring: wiringSchema,
  pages: z.array(pageSchema),
});
