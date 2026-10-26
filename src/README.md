# src/: the agent-workflow CLI

Entry point `bin/agent-workflow.mjs` calls `main` in `cli.mjs`. Specification: `docs/design/cli-spec.md`.
Plain Node ES modules, no dependencies; tests in `tests/` (`node --test`).

| Module | Responsibility |
|---|---|
| `cli.mjs` | Parse, build a command's inputs (paths, clock, Claude dir), run it, print, return the exit code |
| `args.mjs` | Command-line parsing per command, usage errors, the help text |
| `report.mjs` | Render a command result as text lines or as one JSON object |
| `result.mjs` | The shared result object (`commandResult`, `refuse`, `succeed`) and the actions that write a file |
| `adopt.mjs` | `adopt`: plan create/skip/conflict/kept/overwritten, write files and the manifest |
| `sync.mjs` | `sync`: plan and apply managed updates, owned creates, retired and pruned files |
| `sync-decide.mjs` | Pure decisions for `sync` (managed file, conflict resolution, retired file) |
| `check.mjs` | `check`: run project or template checks, count levels, set the exit code |
| `check-project.mjs` | Project checks: entry size, always-on rules, metadata, review-by, drift, board, ledger, CLAUDE.md |
| `check-template.mjs` | Template checks: listing vs disk, placeholders, `from` targets, entry size, metadata |
| `doc-checks.mjs` | Which files are rules and topic docs; findings shared by both check modes |
| `headers.mjs` | Read a doc's header block (frontmatter, leading HTML comments): `paths:`, `source:`, `applies:`, `review-by:` |
| `ledger.mjs` | `ledger`: read the ledger (and usage log), pick the window, produce the summary |
| `ledger-stats.mjs` | Pure ledger statistics: builds, first-pass approval, fix rounds, escalations, layers, overkill |
| `ledger-format.mjs` | The summary's text lines, as in the spec's example |
| `table.mjs` | Parse and validate the `## Rows` table of `docs/harness/ledger.md` |
| `usage.mjs` | Read `<claude dir>/metrics/usage.jsonl`, keep the last row per session, format token counts |
| `vendor.mjs` | `vendor`: map checkout items to `.claude/`, plan and copy, record provenance in the manifest |
| `checkout-version.mjs` | A checkout's version without git: exact tag at HEAD, else `VERSION`, else `package.json` |
| `pack.mjs` | Load and validate `template.json`, read pack bytes (`from` sources), fill owned placeholders |
| `manifest.mjs` | Read and write (atomically) `docs/harness/manifest.json`; build its entries |
| `manifest-validate.mjs` | Manifest shape checks: safe relative keys, known policies, sha256 values, vendored entries |
| `gitroot.mjs` | Project name: basename of the git root (worktrees resolve to the main checkout) |
| `hash.mjs` | sha256 over bytes with CRLF normalised to LF |
| `files.mjs` | File access: native paths from forward-slash paths, read-if-exists, write with parents, listing |
| `text.mjs` | BOM- and CRLF-tolerant line splitting and counting |
| `dates.mjs` | UTC dates and timestamps, ISO date validation |
| `versions.mjs` | Compare dotted version strings |

The Stop hook `template/.claude/hooks/usage-log.mjs` is a separate, self-contained script (it ships into
projects and cannot import from here); its git-root logic mirrors `gitroot.mjs`.
