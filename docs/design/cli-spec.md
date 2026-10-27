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

Values: `date` ISO date; `task` any non-empty id (revised 2026-10-27: `task-NNN`, a group's lead task, or a
project id such as `P2.1`; the first week of real rows used all three); `step` build/review/fix/close; `role`
builder/reviewer/explorer/manager (revised 2026-10-27: the manager writes `close` rows as itself); a line in the
Rows section that does not start with `|` is prose and is skipped (revised 2026-10-27: a Codex session left a
note under its rows);
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

## 10. Addendum (owner, 2026-10-27): `review-due` and `Named in fix notes:`

The weekly review had no trigger (the manager skill said "or it is the weekly day" and nothing read a date).
Two additions:

- `check`, project mode only, `review-due`: the newest `## YYYY-MM-DD` heading in `docs/harness/review-log.md`.
  Missing file → `fail`; no dated heading → `warn` (`has no dated entry`); seven or more days before today →
  `warn` (`last harness review <date>, <n> days ago; weekly review due`); else `ok` with the same prefix.
  Listed next to `review-by`. The manager reads the same date at turn start (`manager.md` → The weekly review).
- `ledger`, a line after `Overkill candidates:`: `Named in fix notes:`. Over the window's rows with step
  `review` and outcome `fix` or `escalated`, or step `fix`, the `note` cell is scanned for harness file names
  (`[\w-]+.md` with an optional `#anchor`, a `.claude/rules/` or `docs/harness/` prefix stripped), counted
  per name, sorted by count then name: `core.md 3  verification.md 1`, or `none`. The convention that makes
  it useful is in `model-policy.md` → The ledger: the note names the file behind the finding.

## 9. Addendum (owner, 2026-10-26): `init` and the `fresh-init` launcher

The owner wants one script to drop into any project that does every deletion and change a migration
needs, and that can be re-run later to pick up updated rules. So: one idempotent CLI command, `init`, and a
thin Windows launcher, `template/fresh-init.cmd`, that calls it. `init` never commits; it prints the git
command to run. The launcher is a managed pack file (revised 2026-10-26): every adopted project carries a
copy at its root, `sync` keeps it current, and the adopt and sync git commands stage it. The sync git
command names the exact paths that changed plus the manifest, never a directory, so a project's own
uncommitted work is never swept into the sync commit.

### `init --project <dir> [--name <n>] [--dry-run] [--json]`

**Not yet adopted** (no `docs/harness/manifest.json`), in this order:

1. **v1 cleanup.** Delete `CLAUDE.md` when every non-blank line starts with `@` (the v1 import file); any
   other `CLAUDE.md` is left and reported (`no-claude-md` will warn). Delete `docs/AGENT_PROTOCOL.md` and
   `docs/tasks/README.md` when their content mentions `agent-workflow` (v1 pointer files). Delete the
   project-level `.claude/agents/` and `.claude/skills/manager/` directories when they exist (v1 copies);
   other skills stay.
2. **The old entry file.** When `AGENTS.md` exists, move it to `docs/project-guide.md` (a `git mv` is not
   available without shelling out: write the new file, delete the old; the project's git sees a rename)
   with this block prepended:
   ```
   <!-- Moved from AGENTS.md by agent-workflow init on <date>. This is the project's own guide: what it is,
        how it is built, its rules. The v2 entry file AGENTS.md stays under 100 lines and points here; the
        rules that bite are split into .claude/rules/ (path-scoped) and docs/ topic files by hand. -->
   ```
   Before moving, parse it:
   - the **Workflow settings table** (a markdown table under a heading containing "Workflow settings"): a
     map setting → value, with the setting name normalised (strip anything in parentheses or backticks,
     trim; so "Hard areas (`opus-xhigh`)" → "Hard areas", "Who pushes (owner, 2026-10-22)" → "Who pushes",
     the parenthetical kept inside the value as "(owner, 2026-10-22) " prefix);
   - the **pointer paragraph**: dropped (not carried into the guide): the paragraph(s) before the first
     `##` heading that mention `agent-workflow`.
3. **Adopt** with the pack (same as `adopt`), with these differences: an existing owned file is kept
   (reported `kept`) and its hash recorded; an existing managed file that differs is **replaced** after the
   old content is saved under `docs/harness/init-backup/<same relative path>` (reported `replaced, old
   copy in docs/harness/init-backup/...`); `{{PROJECT}}` is `--name`, else the `Project` setting from the
   old table, else the folder name.
4. **Fill the new `AGENTS.md`** from the old table: for each v2 Workflow settings row whose setting name
   matches a parsed v1 setting (same normalised name), replace the row's `<placeholder>` cell with the v1
   value. v1-only settings: `Builder checks` goes into an HTML comment directly under the tier table
   (`<!-- v1 Builder checks: <value> ; split these into the tier rows above -->`); `Local services` and
   `Project` are dropped (fixed path; title). The `Harness CLI` row is filled as in adopt. Line 1 becomes
   `# <project name>`.
5. **The board.** When `docs/manager/board.md` was kept and lacks a `Next step:` line, insert after the
   first heading line: a blank line, then a fenced block with `Next step: <fill in>` and
   `Current issues: <fill in>`, then a blank line. Same for a missing `Current issues:`.
6. **.gitignore.** Append each line of `.gitignore.harness` that `.gitignore` lacks (create `.gitignore`
   if absent), then delete `.gitignore.harness` and drop it from the manifest.
7. **Report** every action (one line each, same verbs as adopt plus `deleted`, `moved`, `kept`,
   `replaced`, `filled <n> settings`, `backup`), then the NEXT-STEPS text with one extra first line when
   `docs/project-guide.md` was written: "0. docs/project-guide.md holds the old AGENTS.md: split its rules
   into .claude/rules/ and docs/, then trim it", then the git command:
   `git add -A -- AGENTS.md .claude .agents .codex docs ecc-install.json .gitignore && git commit -m "docs(harness): adopt agent-workflow v<version>"`
   (plus `CLAUDE.md docs/AGENT_PROTOCOL.md` in the `git add` when they were deleted, so the deletions are staged).

**Already adopted:** run `sync` (default options) and step 6's `.gitignore` check; report; print
`git add -A -- .claude .agents .codex docs && git commit -m "docs(harness): sync agent-workflow v<version>"`
when anything changed. Exit codes as `sync`.

`--dry-run` prints the plan with nothing written, including the settings that would be filled.

### `template/fresh-init.cmd`

A Windows launcher: run by path from the project root the first time, then the project's own copy. It
resolves the template repository from `%AGENT_WORKFLOW_HOME%` (default `C:\code\agent-workflow`), refuses with exit 2
when `bin/agent-workflow.mjs` is not there, and runs `init` on the project, exiting with its code. The project is
the folder the script lives in (`%~dp0`: a project's own copy); the template's copy, run by path, takes
the current folder instead. Either way the folder must hold `.git/` or `docs/harness/manifest.json`, or the
launcher refuses with exit 2: a Start-menu, search-result or Win+R launch starts in `C:/Windows/System32`
(owner's report, 2026-10-26), and `%CD%` alone would have adopted it. When the
launcher's parent process is `explorer.exe` (a double-click; found through PowerShell's `Win32_Process`,
two levels up from the PowerShell child) it pauses before exiting, so the window does not close on the
result; from a terminal or a script it never pauses. It passes extra arguments through (`--dry-run`, `--name`). It does not pull the template repository: a
line in `ADOPTING.md` says to `git -C C:\code\agent-workflow pull` first on a machine that is not the
template's origin.

### Tests

- A fixture v1 project (a `CLAUDE.md` of three `@` lines, an `AGENTS.md` with a pointer paragraph, a
  settings table with the v1 names including "Hard areas (`opus-xhigh`)", "Who pushes (owner, 2026-10-22)",
  "Builder checks", "Local services", and project sections after it; `docs/AGENT_PROTOCOL.md` and
  `docs/tasks/README.md` pointer files; a v1 `docs/manager/board.md` without the mandatory lines;
  existing `docs/ROADMAP.md`; a `.codex/config.toml` holding only `[features]\nmulti_agent = true`;
  `.claude/agents/opus-high.md`): `init` deletes the v1 files, moves the entry file, fills the settings
  (assert the Gate, Merge, Hard areas, Who pushes cells and the Builder checks comment), keeps the roadmap,
  backs up and replaces the Codex config, inserts the board lines, merges `.gitignore`, writes the manifest,
  prints the git command with the deleted files; a second `init` runs sync and changes nothing.
- A Codex-only fixture (an `AGENTS.md` with no settings table, a prose `CLAUDE.md`): the entry file moves
  to the guide, no settings filled, the prose `CLAUDE.md` is left and reported.
- An empty project: `init` equals `adopt`.
- `--dry-run` writes nothing.
