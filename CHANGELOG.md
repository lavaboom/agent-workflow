# Changelog

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
