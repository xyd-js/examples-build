import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { availableParallelism } from "node:os";
import { discover, type Example } from "./discover.ts";
import { setBasename } from "./set-basename.ts";

const ROOT = resolve(import.meta.dir, "..");
const EXAMPLES_CACHE = join(ROOT, ".examples-cache");
const EXAMPLES_DIR = join(EXAMPLES_CACHE, "examples");
const DIST_DIR = join(ROOT, "dist");
const LANDING_DIR = join(ROOT, "landing");

const EXAMPLES_REPO_URL = "https://github.com/xyd-js/examples";
const XYD_CLI_VERSION = process.env.XYD_CLI_VERSION ?? "latest";

type BuildResult =
  | { example: Example; status: "ok"; entryHref: string }
  | { example: Example; status: "failed"; reason: string };

async function main() {
  console.log(`▶ examples-build (xyd-js/cli@${XYD_CLI_VERSION})`);

  rmSync(DIST_DIR, { recursive: true, force: true });
  mkdirSync(DIST_DIR, { recursive: true });

  await prepareExamplesRepo();
  const xydBin = await prepareXydCli();

  const all = discover(EXAMPLES_DIR);
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const onlySet = onlyArg
    ? new Set(onlyArg.slice("--only=".length).split(",").filter(Boolean))
    : null;
  const examples = onlySet ? all.filter((e) => onlySet.has(e.slug)) : all;

  const concurrency = parseConcurrency(examples.length);
  console.log(
    `  discovered ${all.length} examples${
      onlySet ? `, building ${examples.length} (filter)` : ""
    }, concurrency=${concurrency}`,
  );

  const results = await runPool(examples, concurrency, (ex) => buildOne(ex, xydBin));

  await writeLanding(results);
  printReport(results);

  const anyFailed = results.some((r) => r.status === "failed");
  if (anyFailed) {
    console.log("\n⚠  some examples failed but were skipped (deploy continues).");
  }
}

function parseConcurrency(n: number): number {
  const arg = process.argv.find((a) => a.startsWith("--concurrency="));
  if (arg) {
    const v = parseInt(arg.slice("--concurrency=".length), 10);
    if (!isNaN(v) && v > 0) return v;
  }
  const env = process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : NaN;
  if (!isNaN(env) && env > 0) return env;
  return Math.max(1, Math.min(n, Math.floor(availableParallelism() / 2) || 1));
}

async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const inflight: Promise<void>[] = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    inflight.push(
      (async function loop() {
        while (true) {
          const idx = next++;
          if (idx >= items.length) return;
          out[idx] = await worker(items[idx]!);
        }
      })(),
    );
  }
  await Promise.all(inflight);
  return out;
}

// Serialize cpSync into shared dist/ across concurrent builds.
let copyChain: Promise<void> = Promise.resolve();
function queueCopy(fn: () => void): Promise<void> {
  const next = copyChain.then(() => fn());
  copyChain = next.catch(() => {});
  return next;
}

async function buildOne(ex: Example, xydBin: string): Promise<BuildResult> {
  const docsPath = join(ex.dir, "docs.json");
  const originalDocs = readFileSync(docsPath, "utf8");
  const xydDir = join(ex.dir, ".xyd");
  const xydBuild = join(xydDir, "build");
  const tag = `[${ex.slug}]`;

  console.log(`▶ ${tag} start  →  ${ex.mountedAt}`);

  try {
    // Nuke the whole .xyd/ to clear any committed-in-submodule stale state
    // (e.g. monday-clone/openai-clone ship a .xyd/node_modules symlink
    // pointing at an absolute path on the original author's machine, which
    // confuses xyd's setup and trips EEXIST on .xyd/host/node_modules).
    rmSync(xydDir, { recursive: true, force: true });
    setBasename(docsPath, ex.mountedAt);

    const startedAt = Date.now();
    const exitCode = await runCaptured(xydBin, ["build"], ex.dir, tag);
    const tookSec = ((Date.now() - startedAt) / 1000).toFixed(1);

    if (exitCode !== 0) {
      return { example: ex, status: "failed", reason: `xyd build exit ${exitCode} (${tookSec}s)` };
    }

    const built = join(xydBuild, "client");
    if (!existsSync(built)) {
      return { example: ex, status: "failed", reason: "no .xyd/build/client output" };
    }

    const slugPath = trimLeadingSlash(ex.mountedAt);
    const entryHref = pickEntryHref(built, ex.mountedAt, slugPath);
    if (!entryHref) {
      return {
        example: ex,
        status: "failed",
        reason: `no HTML emitted under ${slugPath} (likely a prerender error)`,
      };
    }

    await queueCopy(() => cpSync(built, DIST_DIR, { recursive: true }));

    console.log(`✔ ${tag} done   ${tookSec}s  (entry: ${entryHref})`);
    return { example: ex, status: "ok", entryHref };
  } catch (err) {
    return {
      example: ex,
      status: "failed",
      reason: err instanceof Error ? err.message : String(err),
    };
  } finally {
    writeFileSync(docsPath, originalDocs);
    rmSync(xydBuild, { recursive: true, force: true });
  }
}

async function prepareExamplesRepo(): Promise<void> {
  const branch = resolveExamplesBranch();
  console.log(`▶ preparing examples repo at ${EXAMPLES_DIR} (branch: ${branch})`);

  if (!remoteBranchExists(branch)) {
    throw new Error(
      `branch "${branch}" not found on ${EXAMPLES_REPO_URL}. ` +
        `Create the branch in the examples repo or override with EXAMPLES_BRANCH / --examples-branch=<name>.`,
    );
  }

  mkdirSync(EXAMPLES_CACHE, { recursive: true });

  if (!existsSync(join(EXAMPLES_DIR, ".git"))) {
    // Fresh clone with nested submodules (monday-clone, openai-clone, ...).
    const code = await runCaptured(
      "git",
      [
        "clone",
        "--recurse-submodules",
        "--shallow-submodules",
        "--depth=1",
        "--branch",
        branch,
        EXAMPLES_REPO_URL,
        EXAMPLES_DIR,
      ],
      EXAMPLES_CACHE,
      "[examples-clone]",
    );
    if (code !== 0) throw new Error(`failed to clone ${EXAMPLES_REPO_URL}@${branch}`);
  } else {
    // Cache exists: fetch and align with origin/<branch>.
    const fetchCode = await runCaptured(
      "git",
      ["fetch", "--depth=1", "origin", branch],
      EXAMPLES_DIR,
      "[examples-fetch]",
    );
    if (fetchCode !== 0) throw new Error(`failed to fetch ${branch} in examples cache`);

    const checkoutCode = await runCaptured(
      "git",
      ["checkout", "-B", branch, `origin/${branch}`],
      EXAMPLES_DIR,
      "[examples-checkout]",
    );
    if (checkoutCode !== 0) throw new Error(`failed to checkout ${branch} in examples cache`);

    const subCode = await runCaptured(
      "git",
      ["submodule", "update", "--init", "--recursive", "--depth=1"],
      EXAMPLES_DIR,
      "[examples-submodule]",
    );
    if (subCode !== 0) throw new Error(`failed to update nested submodules in examples cache`);
  }

  const sha = spawnSync("git", ["-C", EXAMPLES_DIR, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).stdout?.trim();
  console.log(`✔ examples ready: ${branch}@${sha?.slice(0, 7) ?? "?"}`);
}

function resolveExamplesBranch(): string {
  const argv = process.argv.find((a) => a.startsWith("--examples-branch="));
  if (argv) return argv.slice("--examples-branch=".length);
  if (process.env.EXAMPLES_BRANCH) return process.env.EXAMPLES_BRANCH;

  const r = spawnSync("git", ["-C", ROOT, "rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
  });
  const head = r.stdout?.trim();
  if (head && head !== "HEAD") return head;

  // Detached HEAD (common in CI). Try CI env hints.
  const ci =
    process.env.BRANCH || // Netlify, Vercel
    process.env.GITHUB_REF_NAME || // GitHub Actions
    process.env.CI_COMMIT_BRANCH; // GitLab CI
  if (ci) return ci;

  throw new Error(
    "could not determine parent branch (detached HEAD). " +
      "Set EXAMPLES_BRANCH or pass --examples-branch=<name>.",
  );
}

function remoteBranchExists(branch: string): boolean {
  const r = spawnSync(
    "git",
    ["ls-remote", "--exit-code", "--heads", EXAMPLES_REPO_URL, branch],
    { encoding: "utf8" },
  );
  return r.status === 0;
}

async function prepareXydCli(): Promise<string> {
  const cacheDir = join(ROOT, ".cli-cache");
  const binPath = join(cacheDir, "node_modules", ".bin", "xyd");

  console.log(`▶ installing @xyd-js/cli@${XYD_CLI_VERSION} into .cli-cache`);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(
    join(cacheDir, "package.json"),
    JSON.stringify(
      { name: "xyd-cli-cache", private: true, version: "0.0.0" },
      null,
      2,
    ),
  );

  const installCode = await runCaptured(
    "bun",
    ["add", "--no-save", `@xyd-js/cli@${XYD_CLI_VERSION}`],
    cacheDir,
    "[install]",
  );
  if (installCode !== 0) {
    throw new Error(`failed to install @xyd-js/cli@${XYD_CLI_VERSION}`);
  }
  if (!existsSync(binPath)) {
    throw new Error(`xyd binary not found at ${binPath} after install`);
  }
  console.log(`✔ xyd CLI ready: ${binPath}`);
  return binPath;
}

async function runCaptured(
  cmd: string,
  args: string[],
  cwd: string,
  tag: string,
): Promise<number> {
  const proc = Bun.spawn([cmd, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    process.stderr.write(prefix(tag, stdout));
    process.stderr.write(prefix(tag, stderr));
  }
  return code;
}

function prefix(tag: string, s: string): string {
  if (!s) return "";
  return s
    .replace(/\r?\n$/, "")
    .split("\n")
    .map((l) => `${tag} ${l}\n`)
    .join("");
}

function trimLeadingSlash(p: string): string {
  return p.startsWith("/") ? p.slice(1) : p;
}

function pickEntryHref(
  buildClient: string,
  mountedAt: string,
  slugPath: string,
): string | null {
  if (existsSync(join(buildClient, `${slugPath}.html`))) {
    return mountedAt;
  }
  if (existsSync(join(buildClient, slugPath, "index.html"))) {
    return `${mountedAt}/`;
  }
  const slugDir = join(buildClient, slugPath);
  if (existsSync(slugDir) && statSync(slugDir).isDirectory()) {
    const first = findFirstHtml(slugDir);
    if (first) {
      const rel = first.slice(buildClient.length).replace(/\.html$/, "");
      return rel.startsWith("/") ? rel : `/${rel}`;
    }
  }
  return null;
}

function findFirstHtml(dir: string): string | null {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isFile() && p.endsWith(".html")) return p;
    if (st.isDirectory()) {
      const found = findFirstHtml(p);
      if (found) return found;
    }
  }
  return null;
}

async function writeLanding(results: BuildResult[]) {
  const ok = results.filter(
    (r): r is Extract<BuildResult, { status: "ok" }> => r.status === "ok",
  );

  const sha = readSubmoduleSha();
  const submoduleUrls = parseSubmoduleUrls();

  const { tagsBySlug, featuredOverride, featuredCount } = await import(
    join(LANDING_DIR, "src/data/curated.ts")
  );

  const examples = ok.map(({ example: ex, entryHref }) => ({
    slug: ex.slug,
    title: ex.title,
    description: ex.description,
    mountedAt: ex.mountedAt,
    entryHref,
    tags: (tagsBySlug as Record<string, string[]>)[ex.slug] ?? [],
    repoUrl: repoUrlFor(ex.slug, submoduleUrls),
  }));

  const featuredSlugs = pickFeatured(
    examples.map((e) => e.slug),
    featuredOverride as string[],
    featuredCount as number,
  );

  const generatedPath = join(LANDING_DIR, "src/data/examples.generated.json");
  writeFileSync(
    generatedPath,
    JSON.stringify(
      {
        examples,
        featuredSlugs,
        cliVersion: XYD_CLI_VERSION,
        examplesSha: sha,
      },
      null,
      2,
    ),
  );

  console.log(`▶ landing: ensuring deps`);
  if (!existsSync(join(LANDING_DIR, "node_modules"))) {
    const r = spawnSync("bun", ["install"], { cwd: LANDING_DIR, stdio: "inherit" });
    if (r.status !== 0) throw new Error("landing: bun install failed");
  }

  console.log(`▶ landing: bundling`);
  const r = spawnSync("bun", ["run", "build.ts"], {
    cwd: LANDING_DIR,
    stdio: "inherit",
  });
  if (r.status !== 0) throw new Error("landing: bundle failed");
}

function pickFeatured(
  allSlugs: string[],
  override: string[],
  count: number,
): string[] {
  if (override.length > 0) return override.slice(0, count);
  // Most-recently-touched in the examples repo.
  const r = spawnSync(
    "git",
    [
      "-C",
      EXAMPLES_DIR,
      "log",
      "--name-only",
      "--pretty=format:%ct",
      "--diff-filter=AM",
    ],
    { encoding: "utf8" },
  );
  if (!r.stdout) return allSlugs.slice(0, count);
  const seen = new Map<string, number>();
  let lastTs = 0;
  for (const line of r.stdout.split("\n")) {
    if (/^\d+$/.test(line)) {
      lastTs = parseInt(line, 10);
      continue;
    }
    const top = line.split("/")[0];
    if (top && allSlugs.includes(top) && !seen.has(top)) {
      seen.set(top, lastTs);
    }
  }
  const sorted = [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  for (const s of allSlugs) if (!sorted.includes(s)) sorted.push(s);
  return sorted.slice(0, count);
}

// Parse the examples submodule's .gitmodules to find sub-submodules
// (monday-clone, openai-clone, …). Returns slug → repo URL.
function parseSubmoduleUrls(): Record<string, string> {
  const gm = join(EXAMPLES_DIR, ".gitmodules");
  if (!existsSync(gm)) return {};
  const text = readFileSync(gm, "utf8");
  const out: Record<string, string> = {};
  let curPath: string | null = null;
  for (const line of text.split("\n")) {
    const ls = line.trim();
    if (ls.startsWith("[submodule")) {
      curPath = null;
    } else if (ls.startsWith("path =")) {
      curPath = ls.slice("path =".length).trim();
    } else if (ls.startsWith("url =") && curPath) {
      out[curPath] = normalizeRepoUrl(ls.slice("url =".length).trim());
      curPath = null;
    }
  }
  return out;
}

function normalizeRepoUrl(url: string): string {
  if (url.startsWith("git@github.com:")) {
    return "https://github.com/" + url.slice("git@github.com:".length).replace(/\.git$/, "");
  }
  if (url.endsWith(".git")) return url.slice(0, -4);
  return url;
}

function repoUrlFor(slug: string, submoduleUrls: Record<string, string>): string {
  if (submoduleUrls[slug]) return submoduleUrls[slug]!;
  return `https://github.com/xyd-js/examples/tree/master/${slug}`;
}

function readSubmoduleSha(): string {
  const r = spawnSync("git", ["-C", EXAMPLES_DIR, "rev-parse", "HEAD"], {
    encoding: "utf8",
  });
  return r.stdout?.trim() || "unknown";
}

function printReport(results: BuildResult[]) {
  console.log("\n──── build report ────");
  for (const r of results) {
    if (r.status === "ok") {
      console.log(`  ok      ${r.example.slug}`);
    } else {
      console.log(`  failed  ${r.example.slug}  (${r.reason})`);
    }
  }
  const ok = results.filter((r) => r.status === "ok").length;
  console.log(`  ${ok}/${results.length} succeeded`);
}

main();
