import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";

const HERE = resolve(import.meta.dir);
const REPO_ROOT = resolve(HERE, "..");
const OUT_DIR = process.env.LANDING_OUT
  ? resolve(REPO_ROOT, process.env.LANDING_OUT)
  : join(REPO_ROOT, "dist");
const ASSETS_OUT = join(OUT_DIR, "assets");
const PUBLIC_DIR = join(HERE, "public");

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(ASSETS_OUT, { recursive: true });
if (existsSync(PUBLIC_DIR)) {
  cpSync(PUBLIC_DIR, OUT_DIR, { recursive: true });
}

console.log(`landing → bundling React app to ${OUT_DIR}`);

const result = await Bun.build({
  entrypoints: [join(HERE, "src/main.tsx")],
  outdir: ASSETS_OUT,
  target: "browser",
  format: "esm",
  splitting: false,
  minify: true,
  sourcemap: "linked",
  naming: {
    entry: "landing-[hash].[ext]",
    chunk: "landing-chunk-[hash].[ext]",
    asset: "landing-asset-[hash].[ext]",
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  external: ["/fonts/*"],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  throw new Error("landing bundle failed");
}

const jsArtifact = result.outputs.find(
  (o) => o.kind === "entry-point" && o.path.endsWith(".js"),
);
if (!jsArtifact) throw new Error("no JS entry artifact produced");
const cssArtifact = result.outputs.find((o) => o.path.endsWith(".css"));

const jsName = basename(jsArtifact.path);
const cssName = cssArtifact ? basename(cssArtifact.path) : null;

// CSS is imported from main.tsx. If Bun's bundler didn't emit a CSS file
// (older bun without CSS in the bundle), fall back to copying styles.css.
let inlineCssLink = "";
if (cssName) {
  inlineCssLink = `  <link rel="stylesheet" href="/assets/${cssName}" />`;
} else if (existsSync(join(HERE, "src/styles.css"))) {
  const fallbackName = `landing-fallback.css`;
  cpSync(join(HERE, "src/styles.css"), join(ASSETS_OUT, fallbackName));
  inlineCssLink = `  <link rel="stylesheet" href="/assets/${fallbackName}" />`;
}

const tplPath = join(HERE, "index.html");
const template = readFileSync(tplPath, "utf8");
const html = template
  .replace(
    "<!--ASSETS-->",
    [inlineCssLink, `  <link rel="modulepreload" href="/assets/${jsName}" />`]
      .filter(Boolean)
      .join("\n"),
  )
  .replace(
    "<!--ENTRY-->",
    `<script type="module" src="/assets/${jsName}"></script>`,
  );

writeFileSync(join(OUT_DIR, "index.html"), html);
console.log(
  `landing → wrote index.html + assets/${jsName}${cssName ? ` + assets/${cssName}` : ""}`,
);
