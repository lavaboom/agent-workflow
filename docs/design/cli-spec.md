# `agent-workflow` CLI: specification

Companion to `2026-10-26-harness-v2-design.md` (D1, D7, D10, D12). Plain Node ≥ 18 ES modules, no
dependencies, no build step. Entry point `bin/agent-workflow.mjs`; implementation under `src/`; tests under
`tests/` with `node --test`. Windows is the first platform: use `path` for every path, `fs.promises`, and
`\r\n`-tolerant parsing; never shell out.

Invocation: `node <repo>/bin/agent-workflow.mjs <command> [options]`. Every command accepts `--project <dir>`
(default: the current working directory) and `--template <dir>` (default: `<repo>/template`, resolved from
the script's own location). Every command prints what it did, one line per file, and exits 0 on success,
1 on a refused action (conflict, missing file), 2 on a usage error. `--json` prints a machine-readable
result instead of lines. `--dry-run` plans without writing.

## 1. The template and its manifest

`template/` in this repository is the pack a project receives. `template/template.json` lists every file in
the pack with its policy:

```json
{
  "version": "2.0.0",
  "files": [
    { "path": "AGENTS.md",                      "policy": "owned"   },
    { "path": ".claude/rules/core.md",          "policy": "managed" },
    { "path": ".agents/skills/manager/SKILL.md","policy": "managed", "from": ".claude/skills/manager/SKILL.md" }
  ]
}
```

- `managed`: the project's copy is kept identical to the template; `sync` overwrites it when the template
  changed and the project copy is unmodified, and reports a conflict otherwise.
- `owned`: created once from the template; never touched again by `sync` (the project fills it in).
- `from` (optional): the file's content comes from another pack file (a Codex mirror of a Claude skill), so
  the template holds one source.
- Files use forward slashes in `path`; the CLI converts.

The version is the pack's version, the same string as the repository's git tag without the `v`. `adopt`
and `sync` read it from `template/template.json`, never from git.

`template.json` is the single source of truth for what the pack contains. `check --template` (below)
fails when a file in `template/` is missing from it or listed but absent.

Revised (manager, 2026-10-26): a third placeholder, `{{HARNESS_CLI}}`, joins `{{PROJECT}}` and `{{DATE}}`
(§2, Placeholder substitution). When `adopt` (or `sync`, creating a new `owned` file) writes an `owned` file,
it is replaced with the command that invokes the CLI doing the adopt: `node <absolute path of
bin/agent-workflow.mjs, with forward slashes>`. Like the others it appears in `owned` files only; `check
--template-only` fails when a `managed` file contains it (as for any `{{`).

## 2. The project manifest

`docs/harness/manifest.json` in a project, written by `adopt` and `sync`:

```json
{
  "templateVersion": "2.0.0",
  "adoptedAt": "2026-10-26T15:00:00Z",
  "syncedAt": "2026-10-26T15:00:00Z",
  "files": {
    ".claude/rules/core.md": { "policy": "managed", "sha256": "…" },
    "AGENTS.md":             { "policy": "owned",   "sha256": "…" }
  }
}
```

`sha256` is the hash of the bytes written at adopt or last sync time (the template's bytes, after
substitution for `owned` files). Timestamps are UTC ISO strings.

### Placeholder substitution

When `adopt` writes an `owned` file it replaces `{{PROJECT}}` with `--name <project name>` (default: the
project directory's basename) and `{{DATE}}` with today's UTC date. `managed` files contain no
placeholders; `check --template` fails if one does.

## 3. Commands

### `adopt`

Installs the pack into a project.

1. Refuse (exit 1) if `docs/harness/manifest.json` exists; say "already adopted; use sync".
2. Plan: for each pack file, `create` if absent, `skip` if present and byte-identical to what would be
   written, `conflict` if present and different. With `--force-owned`, an `owned` conflict is left alone and
   reported as `kept` (the project's file wins); with `--force-managed`, a `managed` conflict is
   overwritten. Without the flags, any conflict refuses the whole adopt with the list (nothing is written).
3. Write the files, create directories as needed, write the manifest, print the plan outcome per file.
4. Print the "next steps" block (the readiness checklist) from `template/NEXT-STEPS.txt`, verbatim.

Options: `--name`, `--force-owned`, `--force-managed`, `--dry-run`, `--json`.

### `sync`

Updates managed files to the current template.

1. Refuse if no manifest ("not adopted; use adopt").
2. For each `managed` file in the current `template.json`:
   - project copy missing → `create`;
   - project copy's sha256 equals the manifest's recorded hash and the template's bytes differ → `update`;
   - project copy's hash differs from the recorded one (local edit) and the template's bytes differ →
     `conflict`: do not write; print both facts; with `--take-template` overwrite and report `overwritten`,
     with `--keep-local` record the local hash and report `kept`;
   - identical to the template → `unchanged`.
3. A `managed` file in the manifest that the new `template.json` no longer lists is reported `retired` and
   left in place (the user deletes it); `--prune` deletes it when its hash still matches the manifest.
4. `owned` files: never written; a new `owned` file in the pack that the project lacks is `create`d.
5. Write the manifest with the new version and hashes, `syncedAt` now. Exit 1 if any conflict remained.

Options: `--take-template`, `--keep-local`, `--prune`, `--dry-run`, `--json`.

### `check`

Lean and freshness checks on a project (or on the template with `--template-only`). Each check prints
`ok`, `warn` or `fail` with one line; exit 1 on any `fail`.

Project checks:
- `entry-size`: `AGENTS.md` ≤ 100 lines (`warn` above 100, `fail` above 150).
- `always-on-rules`: files in `.claude/rules/` without a `paths:` frontmatter: `warn` when more than 4, and
  `warn` for any over 60 lines.
- `rule-metadata`: every `.claude/rules/*.md` and `docs/harness/*.md` topic doc (not `ledger.md`,
  `lessons.md`, `review-log.md`, `README.md`) has a header block containing `source:`, `applies:` and
  `review-by:` lines (inside an HTML comment or YAML frontmatter); `warn` per missing file.
- `review-by`: a `review-by:` value that is an ISO date in the past → `warn` naming the file.
- `manifest-drift`: managed files whose current hash differs from the manifest → `warn` (local edit);
   template version older than the template's current → `warn "update available: X → Y"`.
- `board-lines`: `docs/manager/board.md` contains `Next step:` and `Current issues:` lines → `fail` if not.
- `ledger-shape`: `docs/harness/ledger.md` parses (see §4) → `fail` on a malformed row, naming the line.
- `no-claude-md`: a `CLAUDE.md` exists in the project root → `warn` ("AGENTS.md is the entry file; keep
  CLAUDE.md only as `@AGENTS.md` for older Claude Code").

Template checks (`--template-only`, run in this repository's CI): every file under `template/` is listed in
`template.json` and vice versa; no `managed` file contains `{{`; every `from` points at a listed file;
`AGENTS.md` in the template is ≤ 100 lines; every rule and topic doc has the metadata header.

### `ledger`

Reads `docs/harness/ledger.md` (and, with `--usage`, `~/.claude/metrics/usage.jsonl` filtered to the
project) and prints a summary for `--since <ISO date>` (default: 7 days ago) and, with `--all`, all time.

Output (text; `--json` for the object):

```
Ledger 2026-10-19 → 2026-10-26 (42 rows, 17 tasks)
Builds by model:      sonnet 11 (65 %)  opus 6 (35 %)  — codex luna 0, sol 0
First-pass approval:  sonnet 8/11 (73 %)  opus 6/6 (100 %)
Fix rounds per task:  sonnet 0.45  opus 0.00     by tier: docs 0.0 static 0.2 unit 0.5 integration 0.8 e2e 1.0
Escalations:          2 (task-012, task-015)
Failure layers (fix): spec 3  context 1  verification 1  environment 0  state 0  capability 1
Overkill candidates:  3 opus builds approved first pass on docs/static/unit: task-009, task-011, task-014
Usage (this machine): opus 1.2M in / 85k out · sonnet 3.4M in / 210k out · haiku 120k / 9k  (14 sessions)
```

Definitions: a *build* is a row with step `build`; *first-pass approval* is a task whose first `review`
row after its build is `approve`; *fix rounds* counts `fix` rows per task; *escalated* is an outcome value;
*overkill candidates* are tasks whose build row is Opus (or Sol), tier in {docs, static, unit}, and whose
first review is `approve`. Codex rows (tool `codex`) are reported in their own columns with model names
as written.

### `usage-log` (the hook)

`template/.claude/hooks/usage-log.mjs` is a Stop hook. It reads the hook JSON from stdin
(`session_id`, `transcript_path`, `cwd`), reads the transcript JSONL, sums `message.usage` over entries
with `type: "assistant"` grouped by `message.model`, and appends one line to
`~/.claude/metrics/usage.jsonl`:

```json
{"ts":"2026-10-26T15:00:00Z","project":"<basename of the git root of cwd, else cwd>","session_id":"…","models":{"claude-sonnet-5-5":{"input":1200,"output":300,"cache_read":9000,"cache_write":400}}}
```

Rows are cumulative per session (Stop fires per response); `ledger --usage` keeps the last row per
`session_id`. The hook never prints to stdout, exits 0 always, swallows every error (a hook must not block
Claude), and finishes under 200 ms for a 20 MB transcript (stream the file; do not `JSON.parse` the whole
thing at once). `$CLAUDE_CONFIG_DIR`, when set, replaces `~/.claude`.

The project's `.claude/settings.json` registers it:

```json
{ "hooks": { "Stop": [ { "hooks": [ { "type": "command", "command": "node .claude/hooks/usage-log.mjs", "timeout": 5 } ] } ] } }
```

## 4. The ledger table format

`docs/harness/ledger.md` holds one markdown table under a `## Rows` heading. Header, in this order:

```
| date | task | step | role | tool | model | effort | tier | round | outcome | layer | note |
```

Values: `date` ISO date; `task` `task-NNN`; `step` build/review/fix; `role` builder/reviewer/explorer;
`tool` claude/codex; `model` free text (sonnet, opus, haiku, luna, sol, …); `effort`
low/medium/high/xhigh/max; `tier` docs/static/unit/integration/e2e; `round` integer (1 for the first
build and first review); `outcome` approve/fix/escalated/blocked/abandoned/done; `layer`
spec/context/environment/verification/state/capability/none; `note` free text without `|`.

The parser ignores blank lines and the alignment row, trims cells, and reports a row with the wrong
column count or an unknown enum value as malformed with its line number.

Revised (manager, 2026-10-26; replaces the `step` and `outcome` values above, because the build row's
outcome was undefined): `step` is build/review/fix/close, and `outcome` depends on the step:

| step | outcome |
|---|---|
| build, fix | built / blocked / abandoned |
| review | approve / fix / escalated |
| close | done |

The parser accepts exactly these combinations and reports any other as malformed with its line number.
Statistics (§3 `ledger`): *first-pass approval* is a task whose first `review` row is `approve`; *fix rounds
per task* counts `fix` rows; *escalations* counts `review` rows with outcome `escalated`; *failure layers
(fix)* counts the layers of `review` rows with outcome `fix`.

## 5. Tests (node --test)

- `adopt` on an empty temp dir: every pack file created, manifest written with correct hashes and version,
  `{{PROJECT}}` substituted in owned files only, exit 0; a second `adopt` refuses.
- `adopt` with a pre-existing different `AGENTS.md`: refuses and lists the conflict; with `--force-owned`
  keeps the file and records its hash.
- `sync` after a template change to a managed file: `update`; after a local edit to a managed file:
  `conflict` (exit 1), then `--take-template` and `--keep-local` behave as specified; a retired file is
  reported and `--prune` removes it only when unmodified.
- `check`: a fixture project passing every check; fixtures with an oversized `AGENTS.md`, a missing
  `Next step:` line, a malformed ledger row, a past `review-by`.
- `check --template-only` against this repository's `template/` passes (this is the CI test).
- `ledger`: a fixture ledger producing known numbers for every line of the summary; Codex rows counted
  separately; `--usage` with a fixture usage file keeping the last row per session.
- `usage-log`: a fixture transcript with two models and cache fields; a truncated last line; a missing
  transcript; never writes to stdout; appends exactly one row.
- Paths: all tests must pass with backslash paths on Windows and forward slashes on POSIX.

## 6. Repository layout for the code

```
bin/agent-workflow.mjs        argument parsing, dispatch to src/
src/adopt.mjs src/sync.mjs src/check.mjs src/ledger.mjs src/manifest.mjs src/pack.mjs src/hash.mjs src/table.mjs
template/.claude/hooks/usage-log.mjs
tests/*.test.mjs  tests/fixtures/…
package.json                  { "name": "@lavaboom/agent-workflow", "type": "module", "bin": { "agent-workflow": "bin/agent-workflow.mjs" }, "scripts": { "test": "node --test", "check:template": "node bin/agent-workflow.mjs check --template-only" }, "engines": { "node": ">=18" } }
```

Code philosophy applies (`template/docs/harness/building.md` → testable, documentable, readable): small
modules with explicit inputs and outputs; file and function names as documentation; no clever abstractions.

## 7. Addendum (2026-10-26, after measuring ECC's installer): `vendor`

ECC's installer cannot copy one piece (`--skills <one>` expands to its whole module, about sixty files),
so the CLI vendors single files from a pinned checkout of any repository.

### `vendor --from <checkout> <item>...`

- `<checkout>`: a local directory (an ECC clone at a tag, or any repository). `<item>` is a path relative to
  it: `skills/<name>` (a directory) or `agents/<name>.md` (a file); other paths are accepted and copied to
  the same relative path under `.claude/` only when they start with `skills/`, `agents/`, `rules/` or
  `hooks/`; anything else is refused (exit 2) with the reason.
- Destination: `skills/<name>` → `.claude/skills/<name>/` (the whole directory, recursively);
  `agents/<name>.md` → `.claude/agents/<name>.md`; `rules/<lang>/<file>.md` → `.claude/rules/<lang>-<file>.md`;
  `hooks/<file>` → `.claude/hooks/<file>`.
- Refuse (exit 1) when a destination exists and differs, unless `--force`; identical → `skip`.
- Provenance: the manifest gains a `vendored` object keyed by destination path (forward slashes):
  `{ "from": "<the checkout's absolute path>", "source": "<item>", "version": "<git describe --tags of the checkout, read from .git without shelling out: the content of .git/HEAD, and packed-refs or refs/tags lookup; 'unknown' when not resolvable>", "vendoredAt": "<ISO>", "sha256": { "<relative file>": "…" } }`.
  Reading the tag without shelling out may be hard; acceptable fallback: `version` = the checkout's `VERSION`
  file content when present (ECC has one), else `package.json` `version`, else `unknown`.
- `check` gains `vendored-drift`: a vendored file whose hash differs from the manifest → `warn` (local edit;
  expected after trimming an ECC agent; the message says so).
- `--dry-run` and `--json` as for the other commands.
- Tests: vendor a fixture checkout's `skills/x` and `agents/y.md` into a temp project; refusal on an
  unsupported path; refusal on a differing destination and `--force`; provenance written with hashes and
  the fixture's `VERSION`; `check` reports drift after editing a vendored file.

## 8. Addendum: line endings in hashes

Git's `autocrlf` gives the same file CRLF on Windows and LF on Linux, so a manifest written on one would
report false drift on the other. Every sha256 the CLI records or compares (`manifest.files`, `vendored`)
is computed over the file's bytes with `\r\n` normalised to `\n` first. Writes still copy the template's
bytes unchanged.
