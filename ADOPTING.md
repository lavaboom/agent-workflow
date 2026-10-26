# Adopting agent-workflow v2

For a new project, for an existing project with no harness, and for a project on v1. Claude Code
≥ 2.1.277 (it reads `AGENTS.md` natively) and Codex CLI ≥ 0.146 are assumed; Node ≥ 18 for the CLI.

## 1. New project, or an existing project with no harness

Initialisation is its own session: nothing else happens in it until step 10 passes.

1. From the project root, on its main branch, with a clean tree:

   ```bash
   node C:/code/agent-workflow/bin/agent-workflow.mjs adopt --name <project>
   ```

   It writes the pack (`template/template.json` lists the files), `docs/harness/manifest.json`, and prints
   the next steps. It refuses to overwrite a file that already exists with different content; resolve those
   by hand or rerun with `--force-owned` (keep yours) or `--force-managed` (take the template's).
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
11. The fresh-session test: a new session with no verbal context, the five questions from `AGENTS.md` →
    Start here. Fix the file behind any miss.

Codex needs nothing more: it reads `AGENTS.md`, `.codex/config.toml` and `.agents/skills/`. Claude Code
needs nothing more either: `.claude/` is in the project. There is no user-level install.

## 2. A project on v1 (HomeXpense, GroWith)

Yes, a fresh initialisation: v1's files point outside the project and its roles and rules differ from v2's.
Do it in the project's main checkout on master, with no builder running and the manager tab idle (its
board committed). One commit at the end.

Delete first:

- `CLAUDE.md` (the three import lines). Claude Code reads `AGENTS.md` natively; a `CLAUDE.md` present would
  stop that.
- `docs/AGENT_PROTOCOL.md` and the pointer text at the top of `docs/tasks/README.md` (both pointed at this
  repository; `adopt` writes the v2 `docs/tasks/README.md`).
- In `AGENTS.md`: the pointer paragraph ("This project follows the shared workflow: read
  `C:/code/agent-workflow/WORKFLOW.md` first…") and the "Workflow settings" table. Keep the project's own
  sections (overview, stack, commands, project rules); you will paste them into the v2 entry file.
- Any `.claude/agents/`, `.claude/skills/manager/` or `.claude/rules/` the project has (v1 projects should
  have none).

Then:

1. Move the old `AGENTS.md` aside (`git mv AGENTS.md docs/AGENTS.v1.md`) and run `adopt --name <project>`.
2. Rebuild `AGENTS.md` from the template and `docs/AGENTS.v1.md`: the v1 Workflow settings map one to one
   onto the v2 table (`Gate`, `Merge`, `Gate log`, `Capacity`, `Branch database`, `Prepare a worktree`,
   `Hard areas`, `Rules every builder prompt names`, `Docs a builder reads`, `Paid services`, `Who pushes`);
   v1's "Builder checks" becomes the tier table (lint and typecheck under `static`; the unit command under
   `unit`; the integration command under `integration`; the UI definition of done under `e2e`). v1's
   project rules that bite daily (at most a few lines each) become hard constraints 10 and 11; the rest stay
   in the project's docs. Then delete `docs/AGENTS.v1.md`.
3. Steps 3 to 11 of §1. `docs/ROADMAP.md`, `docs/OWNER_QUEUE.md`, `docs/manager/board.md` and the task
   folders are kept as they are: `adopt` skips an existing identical file and refuses a different one, so
   run it, then answer its conflict list with `--force-owned` to keep the project's own copies. Add the
   three mandatory lines to the top of the board. New task folders use `docs/harness/status-template.md`
   (`Tier:` and `Evidence:` are new); existing ones are updated when next touched.
4. The manager tab: `/manager` now resolves to the project's `.claude/skills/manager/`; clear the tab
   once so it loads the v2 skill. The v1 `~/.claude/agents` and `~/.claude/skills/manager` junctions keep
   serving the other project until it migrates; project-level definitions win over them, so no conflict.

When both projects are on v2: delete `v1/`, the root stubs `WORKFLOW.md`, `AGENT_PROTOCOL.md`, `TASKS.md`
in this repository, and the junctions (`cmd /c rmdir "%USERPROFILE%\.claude\agents"`,
`cmd /c rmdir "%USERPROFILE%\.claude\skills\manager"`, `cmd /c rmdir "%USERPROFILE%\.agent-workflow"`).

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
