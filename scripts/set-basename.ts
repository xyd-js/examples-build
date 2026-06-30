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

/**
 * Stamp a build footer into an example's docs.json so the deployed site shows
 * which CLI version + examples commit produced it (e.g.
 * "xyd-js/cli@canary · examples@9fd727f"). Preserves any existing footer fields.
 */
export function setBuildFooter(docsJsonPath: string, stamp: string): void {
  const raw = readFileSync(docsJsonPath, "utf8");
  const docs = JSON.parse(raw) as Record<string, any>;

  docs.components = docs.components ?? {};
  docs.components.footer = {
    kind: "minimal",
    ...(docs.components.footer ?? {}),
    footnote: {
      component: "a",
      props: {
        href: "https://github.com/xyd-js/examples",
        target: "_blank",
        children: stamp,
      },
    },
  };

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
