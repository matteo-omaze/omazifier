import type { MarketApp, BlockRequires } from "./types.js";

export type ManifestEntry = {
  id: string;
  schema: { from: string; name: string };
  component: { from: string; name: string };
  requires?: BlockRequires[];
  private?: boolean;
};

export type RegistryManifest = ManifestEntry[];

function requiredEntries(manifest: RegistryManifest, app: MarketApp): ManifestEntry[] {
  const ids = new Set(app.pages.flatMap((p) => p.blocks.map((b) => b.blockId)));
  const byId = Object.fromEntries(manifest.map((e) => [e.id, e]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of ids) {
      for (const req of byId[id]?.requires ?? []) {
        if (!ids.has(req.blockId)) { ids.add(req.blockId); changed = true; }
      }
    }
  }
  return manifest.filter((e) => ids.has(e.id));
}

/**
 * Parses a registry.ts source file and extracts the manifest structure without executing it.
 * Reads import statements to build a name→path map, then extracts each defineRegistry entry
 * by cross-referencing names to their import paths.
 *
 * Handles: named imports (single and multi-line), `component: X as any`,
 * `requires: [{blockId, subPath}]`, `private: true`.
 */
export function parseRegistryManifest(source: string): RegistryManifest {
  const stripped = source.replace(/\/\/[^\n]*/g, "");

  const importMap = new Map<string, string>();
  const importRe = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;
  for (const m of stripped.matchAll(importRe)) {
    const modulePath = m[2];
    for (const raw of m[1].split(",")) {
      const name = raw.trim();
      if (name) importMap.set(name, modulePath);
    }
  }

  const defIdx = stripped.indexOf("defineRegistry([");
  if (defIdx === -1) throw new Error("defineRegistry([...]) not found in source");
  let depth = 0;
  let arrayStart = -1;
  let arrayEnd = -1;
  for (let i = defIdx; i < stripped.length; i++) {
    if (stripped[i] === "[") {
      if (depth === 0) arrayStart = i + 1;
      depth++;
    } else if (stripped[i] === "]") {
      depth--;
      if (depth === 0) { arrayEnd = i; break; }
    }
  }
  if (arrayStart === -1 || arrayEnd === -1) throw new Error("Could not find defineRegistry array bounds");
  const arrayContent = stripped.slice(arrayStart, arrayEnd);

  const objectTexts: string[] = [];
  let objStart = -1;
  let braceDepth = 0;
  for (let i = 0; i < arrayContent.length; i++) {
    if (arrayContent[i] === "{") {
      if (braceDepth === 0) objStart = i;
      braceDepth++;
    } else if (arrayContent[i] === "}") {
      braceDepth--;
      if (braceDepth === 0 && objStart !== -1) {
        objectTexts.push(arrayContent.slice(objStart, i + 1));
        objStart = -1;
      }
    }
  }

  return objectTexts
    .map((text) => parseEntry(text, importMap))
    .filter((e): e is ManifestEntry => e !== null);
}

function parseEntry(text: string, importMap: Map<string, string>): ManifestEntry | null {
  const idMatch = text.match(/\bid:\s*["']([^"']+)["']/);
  const schemaMatch = text.match(/\bconfigSchema:\s*(\w+)/);
  const componentMatch = text.match(/\bcomponent:\s*(\w+)/);
  const isPrivate = /\bprivate:\s*true\b/.test(text);

  if (!idMatch || !schemaMatch || !componentMatch) return null;

  const id = idMatch[1];
  const schemaName = schemaMatch[1];
  const componentName = componentMatch[1];

  const schemaFrom = importMap.get(schemaName);
  const componentFrom = importMap.get(componentName);
  if (!schemaFrom) throw new Error(`No import found for schema "${schemaName}" (block "${id}")`);
  if (!componentFrom) throw new Error(`No import found for component "${componentName}" (block "${id}")`);

  let requires: BlockRequires[] | undefined;
  const requiresMatch = text.match(/\brequires:\s*(\[[\s\S]*?\])/);
  if (requiresMatch) {
    const pairs = [
      ...requiresMatch[1].matchAll(
        /\{\s*blockId:\s*["']([^"']+)["']\s*,\s*subPath:\s*["']([^"']+)["']\s*\}/g
      ),
    ];
    if (pairs.length) requires = pairs.map((p) => ({ blockId: p[1], subPath: p[2] }));
  }

  return {
    id,
    schema: { from: schemaFrom, name: schemaName },
    component: { from: componentFrom, name: componentName },
    ...(requires ? { requires } : {}),
    ...(isPrivate ? { private: true } : {}),
  };
}

/**
 * Generates a pruned registry TypeScript source string from a manifest and a market app.
 * The manifest maps block IDs to their import paths in the consuming app.
 * The returned source only imports blocks used by the given market.
 */
export function generatePrunedRegistry(manifest: RegistryManifest, app: MarketApp): string {
  const filtered = requiredEntries(manifest, app);
  const excluded = manifest.filter((e) => !filtered.includes(e)).map((e) => e.id);

  const schemaImports = new Map<string, string[]>();
  const componentImports = new Map<string, string[]>();
  for (const entry of filtered) {
    if (!schemaImports.has(entry.schema.from)) schemaImports.set(entry.schema.from, []);
    schemaImports.get(entry.schema.from)!.push(entry.schema.name);
    if (!componentImports.has(entry.component.from)) componentImports.set(entry.component.from, []);
    componentImports.get(entry.component.from)!.push(entry.component.name);
  }

  function renderEntry(entry: ManifestEntry): string {
    const parts = [
      `id: "${entry.id}"`,
      `configSchema: ${entry.schema.name}`,
      `component: ${entry.component.name} as any`,
    ];
    if (entry.requires?.length) parts.push(`requires: ${JSON.stringify(entry.requires)}`);
    if (entry.private) parts.push(`private: true`);
    return `  { ${parts.join(", ")} }`;
  }

  return [
    `// GENERATED — do not edit. Pruned registry for market: ${app.market.id}.`,
    `// Excluded: ${excluded.join(", ") || "none"}`,
    "",
    `import { defineRegistry } from "omazifier";`,
    ...[...schemaImports.entries()].map(
      ([from, names]) => `import { ${names.join(", ")} } from "${from}";`
    ),
    ...[...componentImports.entries()].map(
      ([from, names]) => `import { ${names.join(", ")} } from "${from}";`
    ),
    "",
    `export const registry = defineRegistry([`,
    filtered.map(renderEntry).join(",\n"),
    `]);`,
    "",
  ].join("\n");
}
