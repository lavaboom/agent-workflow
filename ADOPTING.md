# Adopting agent-workflow v2

For a new project, an existing project with no harness, a project on v1, and keeping any of them current.
Claude Code ≥ 2.1.277 (it reads `AGENTS.md` natively) and Codex CLI ≥ 0.146 are assumed; Node ≥ 18 for the
CLI. The template repository lives at `C:degent-workflow` on the owner's machine (set
`AGENT_WORKFLOW_HOME` elsewhere).

## 0. One script for every case: `fresh-init`

`scripts/fresh-init.cmd` (owner, 2026-10-26) is the one entry point. Run it from the project root, or copy it
into the project folder and double-click it:

```bat
C:degent-workflowscriptsresh-init.cmd            :: first run: adopt; later runs: sync
C:degent-workflowscriptsresh-init.cmd --dry-run  :: show the plan, change nothing
```

It runs `agent-workflow init`, which is idempotent:

- **First run** (the project has no `docs/harness/manifest.json`): removes the v1 files when it finds them
  (an import-only `CLAUDE.md`, the `docs/AGENT_PROTOCOL.md` and `docs/tasks/README.md` pointer files, a
  project-level `.claude/agents/` or `.claude/skills/manager/`), moves the old `AGENTS.md` to
  `docs/project-guide.md` with its Workflow settings carried into the new entry file, keeps the project's
  roadmap, owner queue, board and local-services doc, backs up and replaces a differing managed file under
  `docs/harness/init-backup/`, adds the mandatory board lines, merges `.gitignore`, and prints the next
  steps and the git command. Nothing is committed by the script.
- **Later runs**: `sync` (managed files updated to the template's current version, local edits reported as
  conflicts) plus the `.gitignore` check. So updating a project to new global rules is: pull the template
  repository (`git -C C:degent-workflow pull` on a machine that is not where the rules are edited),
  then run `fresh-init` in the project, then commit. No deleting is needed.

A new project needs no more than "follow the procedures in `C:degent-workflow`": the first step of
those procedures is this script, and `template/NEXT-STEPS.txt` is what it prints afterwards.

## 1. New project, or an existing project with no harness

Initialisation is its own session: nothing else happens in it until step 10 passes.

1. From the project root, on its main branch, with a clean tree: `C:degent-workflowscriptsresh-init.cmd`
   (§0). It writes the pack (`template/template.json` lists the files), `docs/harness/manifest.json`, and
   prints the next steps.
2. `AGENTS.md`: fill every `<placeholder>`: what the project is, the install, readiness and dev-server
   commands, the tier table (which commands run for `docs`, `static`, `unit`, `integration`, `e2e`), the
   project-specific hard constraints, every Workflow setting. Stay under 100 lines; details go in
   `docs/`.
3. `.claude/rules/hard-areas.md`: the paths and rules of the areas that always get Opus, or delete the file.
   `.claude/rules/phase-*.md`: keep the file matching the Phase setting; delete the rest.
4. `docs/local-services.md`: the shared services, the test users, the dev server per worktree.
5. `docs/manager/board.md`: the first `Next step:` and `Current issues:` lines. `docs/ROADMAP.md`: the
   product principles and the first items.
6. `.gitignore`: append the lines in `.gitignore.harness`, then delete that file.
7. Tooling, optional: read `docs/harness/tooling.md`. Single ECC pieces are vendored from a pinned checkout
   (`agent-workflow vendor --from C:/code/ECC skills/<name> agents/<name>.md`); a whole module (only the
   hooks runtime is worth it) goes through `ecc-install.json` and `npx ecc-universal@2.2.3 install --config
   ecc-install.json --dry-run`. Record every choice in `docs/harness/review-log.md`.
8. Run the readiness command; a failing baseline is fixed now.
9. `node C:/code/agent-workflow/bin/agent-workflow.mjs check`: no `fail` lines.
10. Commit on master, harness files only:
    `git add AGENTS.md .claude .agents .codex docs ecc-install.json .gitignore && git commit -m "docs(harness): adopt agent-workflow v2"`.
11. The fresh-session test: a new session with no verbal context, the five questions in
    `docs/harness/session.md` → The fresh-session test. Fix the file behind any miss.

Codex needs nothing more: it reads `AGENTS.md`, `.codex/config.toml` and `.agents/skills/`. Claude Code
needs nothing more either: `.claude/` is in the project. There is no user-level install.

## 2. A project on v1

Yes, a fresh initialisation: v1's files point outside the project and its roles and rules differ from v2's.
Every project on v1 migrates at the same time (owner, 2026-10-26), because Claude Code gives a personal
skill precedence over a project skill of the same name: while the v1 `~/.claude/skills/manager` junction
exists, `/manager` in a migrated project would still run the v1 manager. So, once, on the machine:

```bat
cmd /c rmdir "%USERPROFILE%\.claude\skills\manager"
cmd /c rmdir "%USERPROFILE%\.claude\agents"
cmd /c rmdir "%USERPROFILE%\.agent-workflow"
```

Then, per project, in its main checkout on master with the manager tab idle (its board committed):

1. `fresh-init --dry-run`, read the plan, then `fresh-init` (§0). It removes the v1 files, moves the old
   `AGENTS.md` to `docs/project-guide.md` and carries its Workflow settings into the new entry file.
2. **The editorial split** of `docs/project-guide.md`, by hand or by a dispatched Opus builder with this
   recipe (the result is reviewed like any task):
   - `AGENTS.md` stays under 100 lines: fill "What this is", "Stack", the three commands, the tier table
     (v1's "Builder checks" comment under it: lint and typecheck under `static`, the unit command under
     `unit`, the integration command under `integration`, the browser or e2e command under `e2e`), the
     "How the code is organised" row (the project's architecture doc), hard constraints 10 and 11 (the one
     or two project rules that bite in every task, one line each, with their owner tags), and the Phase row.
   - Each v1 section that is a **rule for a part of the codebase** becomes a path-scoped file
     `.claude/rules/<topic>.md` with `paths:` for the files it governs, the `source`/`applies`/`review-by`
     header, and the text trimmed to what an agent needs while editing those files (a "Database Safety
     Rules" section → `paths: supabase/**, src/lib/db/**`; a "Definition of done: UI work" section →
     `paths: src/app/**, src/components/**`). The v1 "Rules every builder prompt names" setting lists them.
   - Each v1 section that is **reference** (architecture, deployment, conventions, test strategy) moves to
     its own `docs/<topic>.md` when no such doc exists yet, or is merged into the existing one; the guide
     keeps a one-line pointer.
   - `.claude/rules/hard-areas.md` gets the v1 "Hard areas" paths; `.claude/rules/phase-pre-launch.md`
     stays or goes with the Phase; `docs/local-services.md` is kept as it was.
   - When nothing is left in `docs/project-guide.md` but pointers, delete it.
3. Steps 7 to 11 of §1: readiness, `check`, the commit, the fresh-session test. The manager tab is cleared
   once so it loads the project's v2 skill.

When every project is on v2, the template repository drops `v1/` and the root stubs `WORKFLOW.md`,
`AGENT_PROTOCOL.md`, `TASKS.md` (owner, 2026-10-26: no grace period).

## 3. Keeping a project current

- `node C:/code/agent-workflow/bin/agent-workflow.mjs sync --dry-run` shows what a newer template would
  change; `sync` applies it. A managed file the project edited is a conflict: upstream the edit here (a
  commit and a tag) and `sync --take-template`, or `sync --keep-local` and note why in the review log.
- The weekly `/harness-review` runs `check`, `ledger` and `sync --dry-run` and writes the review log.
- Cloud sessions and CI see the project's copies; nothing points at this repository at run time.

## 4. Verifying an adoption

- `check` passes with no `fail`.
- `/agents` in a Claude Code session lists `builder`, `reviewer`, `explorer`; `/skills` lists `manager`,
  `harness-review`, `clock-out`; `/context` shows `AGENTS.md` and the always-on rules, nothing larger.
- `codex` in the project: `/agent` lists the three roles; the skills folder is picked up.
- A dispatched builder's report quotes the tier's commands with results; a reviewer's verdict has the four
  sections; both have a ledger row.
