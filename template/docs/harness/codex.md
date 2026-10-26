# Codex

<!--
source: v1 WORKFLOW.md (Codex sections) and ECC's Codex plugin layout; the owner's brief (same ideas for every tool)
applies: a Codex CLI or app session in this project, read once
review-by: 2027-01-31
-->

Codex reads `AGENTS.md` natively, so the entry file, the hard constraints and the Workflow settings are the
same. What differs is the mechanics below. The `.claude/rules/` files are Claude-only; their substance is in
`AGENTS.md` → Hard constraints and in the topic documents.

## Roles

`.codex/config.toml` enables multi-agent mode and defines three roles, mirrored on
`.claude/agents/`:

| Role | File | Model, effort (default; override per spawn) | Sandbox |
|---|---|---|---|
| `builder` | `.codex/agents/builder.toml` | `gpt-6-luna`, medium | workspace-write |
| `reviewer` | `.codex/agents/reviewer.toml` | `gpt-6-sol`, medium | read-only (runs checks, cannot edit) |
| `explorer` | `.codex/agents/explorer.toml` | `gpt-6-luna`, low | read-only |

The ladder in `model-policy.md` maps Sonnet to Luna and Opus to Sol; pass the effort the row says when
spawning. The parent session owns integration and final verification; a subagent reports, it does not
merge or push.

## Skills

Codex loads skills from `.agents/skills/`. The three harness skills (`manager`, `harness-review`,
`clock-out`) are mirrored there by `agent-workflow adopt` and `sync`; their text is tool-neutral except the
"Tool notes" section at the end of each. ECC skills chosen in `ecc-install.json` can be installed for
Codex with target `codex` (user level) or copied into `.agents/skills/` by hand; record the choice in
`review-log.md`.

## Sessions

- Clock in and clock out are `session.md`. A Codex session that compacts mid-task says so at the end and
  writes `handoff-<topic>.md` so another session can continue.
- Work outside the current task's scope is not implemented; it is recorded as a follow-up task
  (`task-flow.md` → Small tasks) or under `For the roadmap:` in `status.md`, and mentioned in the final
  response. It is not added to the roadmap unless the owner says so.
- A Codex session that builds or reviews writes its own ledger rows (`model-policy.md`) with `tool: codex`.
- Worktrees: the Worktrees setting, not Codex's own location (`places.md`).

## What Codex does not get

No hooks from this template (the usage log is a Claude Code Stop hook). Token accounting for Codex comes
from the ledger rows and `/status` in the session; the weekly review notes Codex usage from the rows.
