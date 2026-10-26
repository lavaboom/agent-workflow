<!--
source: agent-workflow v2; Claude Code specifics (dispatching, model and effort per call, skills, hooks)
applies: every Claude Code session; Codex ignores this file (it reads docs/harness/codex.md)
review-by: 2027-01-31
-->

# Claude Code

- **Roles are `.claude/agents/`:** `builder` (edits, runs checks, never spawns), `reviewer` (read-only plus
  Bash to run checks; never edits), `explorer` (read-only). Dispatch with `subagent_type` set to the role and
  **`model` and `effort` passed explicitly on every call**: the role file sets neither, and an omitted model
  inherits the session's. The ladder is `docs/harness/model-policy.md`; Fable never runs as a subagent
  (owner, standing).
- **A plan you write is executed subagent-driven:** a fresh builder per plan task, then a reviewer; do not ask
  the owner which execution approach to use. Specs and plans go in the task folder (`docs/harness/task-flow.md`),
  whatever a skill's default location is; worktrees go where the Worktrees setting says, not where a skill or
  the app would put them.
- **A subagent cannot ask.** It has this project's `AGENTS.md`, these rules and its prompt, nothing of the
  parent's conversation. A decision it needs goes in `status.md` as `Blocked on:` and in its report.
- **Finishing up** (`superpowers:finishing-a-development-branch` and the like) means setting `REVIEW`, not
  merging or opening a PR.
- **`/manager`, `/harness-review`, `/clock-out`** are this project's skills (`.claude/skills/`). The manager
  tab reads `docs/harness/manager.md`; every other session reads `docs/harness/session.md` at the end.
- **Context is disposable, the repository is not.** Hand off at 60 % context (the manager) or before a long
  task's second half (anyone): write `status.md` or a `handoff-<topic>.md`, then `/clear`.
- **Record every dispatch in `docs/harness/ledger.md`** when its report arrives (the manager), one row per
  build, review and fix round (`docs/harness/model-policy.md` → The ledger).
