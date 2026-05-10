import { readFileSync, writeFileSync } from "node:fs";

export function setBasename(docsJsonPath: string, basename: string): void {
  const raw = readFileSync(docsJsonPath, "utf8");
  const docs = JSON.parse(raw) as Record<string, unknown> & {
    advanced?: Record<string, unknown>;
  };
  const current = docs.advanced?.basename;
  if (current === basename) return;

  docs.advanced = { ...(docs.advanced ?? {}), basename };
  writeFileSync(docsJsonPath, JSON.stringify(docs, null, 2) + "\n", "utf8");
}

if (import.meta.main) {
  const [path, basename] = process.argv.slice(2);
  if (!path || !basename) {
    console.error("usage: set-basename <docs.json> <basename>");
    process.exit(1);
  }
  setBasename(path, basename);
}
