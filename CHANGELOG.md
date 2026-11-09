# Changelog

## v2.1.4 (2026-11-09)

Upstreamed from a project at its second weekly review. The always-on rule `.claude/rules/claude-code.md` is
removed: a week with it switched off (122 builds) showed no builder asking, merging or dispatched without a
model, and each of its sentences already lives in the role files, `core.md`, `session.md` or the manager
skill; `sync --prune` removes a project's copy. The manager skill gains four rules: an answered `Q-` item is
marked done in every copy in one commit (the board's line too; `owner-queue.md` says the same); a queue row
that needs a rule or a short spec is the manager's work, and an empty queue is rebuilt from the backlog before
it is called empty; a ruling about what the code does is checked against the code first and cites its
`file:line`; a plan task names the callers of a function it changes and every writer of a table whose writers
change. The worktree is cut after the claim commit. A builder's log goes under its own scratchpad
(`dispatch-prompts.md`).

## v2.1.3 (2026-11-02)

Three rules learnt in the first week of use, upstreamed from a project at its weekly review: a documentation
file that several running tasks must update may be shared (code and test paths never are; `core.md`, the
manager skill's step 3); a `Q-` item carries everything the owner needs inline, never a pointer (`core.md`);
a builder never `git stash`es in a worktree, `refs/stash` being one stack for every worktree (`building.md`
step 5).

## v2.1.2 (2026-10-27)

The weekly review now prompts itself: `check` reports `review-due` when the newest `review-log.md` entry is
seven days old, and the manager reads that date every turn, shows it in the status brief, runs the review
under Autopilot or asks once per tab. Ledger fix notes name the harness file behind a finding, and `ledger`
counts those names (`Named in fix notes:`). The ablation step says how to disable a component without
deleting it. The ledger parser accepts what the first week of real rows used: role `manager` on close rows
and any non-empty task id (a group's lead task, a Codex project's roadmap item).

## v2.1.1 (2026-10-26)

The launcher moves into the pack as `template/fresh-init.cmd` (managed): every adopted project carries its
own copy, `sync` keeps it current, and double-clicked in Explorer it keeps its window open until a key is
pressed. The sync git command stages the exact changed paths and the manifest instead of whole directories.
`.cmd` files are checked out with CRLF.

## v2.1.0 (2026-10-26)

`init` and `scripts/fresh-init.cmd`: one idempotent entry point that adopts a project the first time (with
v1 cleanup and the old entry file moved to `docs/project-guide.md`) and syncs it every time after. `v1/` and
the root stubs are removed from `main` (tag `v1.0.0` keeps them). Owner decisions of 2026-10-26 recorded.

## v2.0.0 (2026-10-26)

The harness is copied into each project instead of linked from it; one entry file (`AGENTS.md`) for every
tool; three least-privilege roles with `model` and `effort` passed per dispatch; verification tiers and a
reviewer contract (`APPROVE`/`FIX` with `what · why · fix` findings); a Sonnet-first model ladder with an
outcomes ledger and planner lessons; clock-in and clock-out routines; a weekly harness review; ECC used as
a per-project library through `ecc-install.json`; a dependency-free CLI (`adopt`, `sync`, `check`, `ledger`)
and a usage-log hook. Design: `docs/design/2026-10-26-harness-v2-design.md`. v1 is frozen under `v1/`.

## v1.0.0 (2026-10-22)

The shared workflow as adopted by the first two projects: `WORKFLOW.md`, `AGENT_PROTOCOL.md`, `TASKS.md`,
`claude/` (four effort-level agents, the manager skill), `templates/`, `install.ps1` (user-level junctions).
