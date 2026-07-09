import type { MarketApp, Registry } from "./types.js";
import { marketAppSchema } from "./schema.js";

export type ValidationIssue = { path: string; message: string };
export type ValidationResult =
  | { ok: true; app: MarketApp }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Validate a composition file end to end:
 *  1. structural schema (shape + version),
 *  2. every referenced block id exists in the registry,
 *  3. every block's config satisfies THAT block's own schema.
 *
 * This is the build-time gate. It runs the same whether the file was authored in TypeScript
 * or produced by a future UI.
 */
export function validateComposition(
  input: unknown,
  registry: Registry<any>,
): ValidationResult {
  const parsed = marketAppSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const app = parsed.data as MarketApp;
  const issues: ValidationIssue[] = [];

  app.pages.forEach((page, pi) => {
    page.blocks.forEach((instance, bi) => {
      const base = `pages[${pi}].blocks[${bi}]`;
      const def = registry.get(instance.blockId);
      if (!def) {
        issues.push({
          path: `${base}.blockId`,
          message: `Unknown block "${instance.blockId}". Registered: ${
            registry.ids().join(", ") || "(none)"
          }`,
        });
        return;
      }
      const cfg = def.configSchema.safeParse(instance.config);
      if (!cfg.success) {
        for (const issue of cfg.error.issues) {
          issues.push({
            path: `${base}.config.${issue.path.join(".")}`,
            message: issue.message,
          });
        }
      }
    });
  });

  return issues.length ? { ok: false, issues } : { ok: true, app };
}
