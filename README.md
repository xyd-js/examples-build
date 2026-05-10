# examples-build

Build orchestrator for **examples.xyd.dev** — turns every example in
[`xyd-js/examples`](https://github.com/xyd-js/examples) into a single static
site whose subpaths map to individual examples:

- `examples.xyd.dev/abtesting`
- `examples.xyd.dev/custom-js`
- `examples.xyd.dev/openapi`
- … etc.

## How it works

1. `examples/` is a git submodule pointing at `xyd-js/examples`.
2. On startup, `scripts/build-all.ts` installs `@xyd-js/cli@$XYD_CLI_VERSION`
   once into `.cli-cache/` so concurrent runs share a single binary (avoids
   `bunx` racing on the global cache).
3. It then discovers every directory with a `docs.json` and builds them
   **concurrently** (default: `availableParallelism()/2`, configurable via
   `--concurrency=N` or `CONCURRENCY=N`). Each build:
   - patches `docs.json` so `advanced.basename = "/<slug>"`;
   - runs `xyd build` (in-place, so sibling refs like `../.snippets/*`
     resolve);
   - restores the original `docs.json`.
4. Each build's `.xyd/build/client/*` is merged into `dist/`. The merge step
   is serialized so concurrent builds don't race on `dist/assets/`.
5. A small landing page (`landing/`) is rendered to `dist/index.html`.
6. Netlify publishes `dist/`.

The `basename` example is special-cased: its existing `/my-base` is preserved,
so it lives at `examples.xyd.dev/my-base/` and the landing page calls that
out.

A failing example is logged and skipped — the deploy still ships the rest.

## Local dev

One-shot (init submodules → install → build → serve):

```sh
git clone git@github.com:xyd-js/examples-build
cd examples-build
./scripts/run-local.sh                  # all 18 examples, serves at :4321
./scripts/run-local.sh abtesting        # build a single example
./scripts/run-local.sh abtesting,basename
NO_SERVE=1 ./scripts/run-local.sh       # build only
PORT=8080 ./scripts/run-local.sh        # custom port
```

Or step by step (after `git clone --recurse-submodules`):

```sh
bun install
bun run build                           # → dist/
bun run serve                           # → http://localhost:4321
bun run build:only=abtesting,basename   # subset
bun run discover                        # list slug → mountedAt
```

Pin the xyd CLI version, or change concurrency:

```sh
XYD_CLI_VERSION=0.1.0-xyd.197 bun run build
CONCURRENCY=8 bun run build
bun run scripts/build-all.ts --concurrency=8 --only=abtesting,custom-icons
```

## Updating the examples submodule

```sh
git -C examples fetch origin
git -C examples checkout origin/main
git add examples
git commit -m "bump examples"
```

Then deploy via the GitHub Actions workflow.

## Deploying

Manual only — go to **Actions → deploy → Run workflow** and (optionally)
override `xyd_cli_version`. The default is `latest`.

Required GitHub secrets:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`
