# Changelog

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
