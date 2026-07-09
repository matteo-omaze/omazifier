import { z } from "zod";
import { createRegistry } from "./registry.js";
import type { Registry } from "./types.js";

/**
 * A registry of fake blocks for engine tests. Components are plain strings — the engine is
 * platform-agnostic and never inspects the component, so a string stands in fine.
 */
export function testRegistry(): Registry<string> {
  const registry = createRegistry<string>();
  registry.register({
    id: "hero",
    configSchema: z.object({
      heading: z.string(),
      variant: z.enum(["campaign", "plain"]).default("plain"),
    }),
    component: "HeroComponent",
  });
  registry.register({
    id: "offer-grid",
    configSchema: z.object({ columns: z.number().int().min(1).max(4).default(3) }),
    component: "OfferGridComponent",
  });
  // The split: two usage-named blocks fill the same "entry-route" slot.
  registry.register({
    id: "open-entry",
    configSchema: z.object({ postalAddress: z.string() }),
    component: "OpenEntryComponent",
  });
  registry.register({
    id: "verified-entry",
    configSchema: z.object({ provider: z.enum(["schufa", "postident"]) }),
    component: "VerifiedEntryComponent",
  });
  return registry;
}
