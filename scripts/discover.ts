import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type Example = {
  slug: string;
  dir: string;
  mountedAt: string;
  title: string;
  description: string;
};

const SPECIAL_BASENAME: Record<string, string> = {
  basename: "/my-base",
};

export function discover(examplesRoot: string): Example[] {
  const out: Example[] = [];
  for (const name of readdirSync(examplesRoot).sort()) {
    if (name.startsWith(".")) continue;
    const dir = join(examplesRoot, name);
    if (!statSync(dir).isDirectory()) continue;
    const docsPath = join(dir, "docs.json");
    if (!existsSync(docsPath)) continue;

    const mountedAt = SPECIAL_BASENAME[name] ?? `/${name}`;
    const docs = readDocsJson(docsPath);
    out.push({
      slug: name,
      dir,
      mountedAt,
      title: docs.name ?? prettySlug(name),
      description: docs.description ?? "",
    });
  }
  return out;
}

function readDocsJson(path: string): { name?: string; description?: string } {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

const ACRONYMS = new Set(["api", "ui", "ai", "mcp", "jwt", "oauth", "ab", "openapi"]);
const TITLE_OVERRIDES: Record<string, string> = {
  abtesting: "A/B Testing",
  "ask-ai": "Ask AI",
  "custom-js": "Custom JavaScript",
  "custom-icons": "Custom Icons",
  graphql: "GraphQL",
  graphviz: "Graphviz",
  mcp: "MCP",
  "monday-clone": "Monday clone",
  opencli: "OpenCLI",
  "opencli-orbit": "OpenCLI (nested commands)",
  "openai-clone": "OpenAI clone",
  openapi: "OpenAPI",
  "openapi-serve": "OpenAPI Serve",
  "react-components": "React Components",
  syntaxhighlight: "Syntax highlighting",
  "vite-custom-configuration": "Vite Custom Configuration",
  basename: "Custom basename",
  "access-control-edge-custom-page-ui": "Edge access — custom page UI",
  "access-control-edge-jwt": "Edge access — JWT",
  "access-control-edge-oauth": "Edge access — OAuth",
  "access-control-edge-password": "Edge access — password",
  "access-control-jwt": "Access control — JWT",
  "access-control-oauth": "Access control — OAuth",
};

function prettySlug(slug: string): string {
  if (TITLE_OVERRIDES[slug]) return TITLE_OVERRIDES[slug]!;
  return slug
    .split("-")
    .map((p) => (ACRONYMS.has(p) ? p.toUpperCase() : p[0]!.toUpperCase() + p.slice(1)))
    .join(" ");
}

if (import.meta.main) {
  const root = process.argv[2] ?? join(process.cwd(), "examples");
  for (const ex of discover(root)) {
    console.log(`${ex.slug.padEnd(40)} → ${ex.mountedAt}`);
  }
}
