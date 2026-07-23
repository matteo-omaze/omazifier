// Helper spawned by omazifier-prune: loads a TypeScript market file and serialises it as JSON.
const [, , marketFile] = process.argv;
if (!marketFile) throw new Error("Usage: tsx dump-market.ts <path/to/market.ts>");
const { default: app } = await import(marketFile);
process.stdout.write(JSON.stringify(app));
