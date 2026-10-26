# Orchestrated mode: the manager

<!--
source: v1 AGENT_PROTOCOL.md (orchestrated mode) and the v1 manager skill, with v2's roles, ladder and ledger
applies: the owner's pinned manager tab; everyone else reads it to know what the manager does
review-by: 2027-01-31
-->

The owner runs the flow from one pinned tab, the manager (`/manager`, `.claude/skills/manager/SKILL.md`;
owner, 2026-10-10). The roles in `task-flow.md` do not change; what changes is who plays them.

- **The manager** is the planner, the claimer, the reviewer of record and the closer. It claims
  (`Owner: claude:manager`), writes the brief, the specs and the plans on master, dispatches a builder per
  plan task and a reviewer per review, writes down the follow-ups a report names, never runs two tasks at
  once that share a `Touches:` path (owner, 2026-10-22), merges with the merge command, closes, writes the
  ledger row for every dispatch, and keeps its state in `docs/manager/board.md`. **It reads reports, never
  code or diffs**; its context is for the owner, the briefs, the specs, the plans and the rulings.
- **A builder** (`.claude/agents/builder.md`) builds one plan task or one small task in the task's worktree,
  commits with `status.md` updated, sets `REVIEW` after the last plan task or `BLOCKED` when it needs a
  decision, and reports. It never asks, merges or pushes. A ruling or spec change for a task with a branch
  is made on that branch, by the builder on the manager's instruction, never on master's copy.
- **A reviewer** (`.claude/agents/reviewer.md`) reviews one plan task, or the whole branch before the merge,
  re-runs the checks, and returns `APPROVE` or `FIX`. It cannot edit; findings go back to the builder.
- **Who runs what** is `model-policy.md`: Sonnet builds by default, Opus where the ladder says, Opus reviews
  code tiers, Fable only in this tab and never as a subagent. `model` and `effort` are passed on every
  dispatch.
- **A brief** (`brief-<topic>.md`) is the feature's high-level plan in the product user's words, approved by
  the owner before any spec. Its `Approvals:` line says whether the owner also approves the spec (default:
  only the brief).
- **Decisions are tagged** `(owner, date)` or `(manager, date)` in the spec. A subagent decides nothing a
  user would notice.
- **Capacity is checked before every dispatch** when the project has a capacity command (Workflow settings);
  its verdicts: `dispatch`, `dispatch-without-stack` (a task that adds a migration waits), `wait`.
- **Other tabs work as before.** "Pick up task-NNN" in a separate tab is unchanged; the manager respects
  `Owner:` like anyone and never dispatches a task another tab owns.

## The board

`docs/manager/board.md` is the manager's memory, changed only in docs commits on master from the main
checkout (`docs(manager): board`). Its first lines are what a fresh session reads first and are mandatory:

```
Next step: <the one thing the next turn does>
Current issues: <what is broken or blocked right now, one line each, or "none">
Autopilot: on | off
```

Then **Running** (one row per live or resumable dispatch), **Queue** (one row per task folder, in order),
**Blocked**, **Needs the owner**, **Rulings** (dated, tagged), **Done this week**.

## Rulings

A subagent that needs a decision sets `BLOCKED` with `Blocked on:` in `status.md` on its branch, commits,
and reports. Then:

- **The manager rules** when the brief's decisions or the product principles (`docs/ROADMAP.md` → Product
  principles) settle it, or when no user would notice the difference. Tagged `(manager, date)`, listed under
  the board's **Rulings**.
- **The owner decides** a choice between experiences the principles do not settle, anything about money or
  what is stored, and anything that needs their accounts or devices (then a `Q-` item).
- **Where it is written:** a task with a branch gets its spec edited on that branch, by the resumed builder
  ("add to the spec under Decisions: …"). Before a branch exists the manager edits the spec on master. Never
  both copies.

## Context and limits

The manager hands off at 60 % context: write the board (`Next step:` with the real next step), commit,
push as "Who pushes" says, then `/clear` and `/manager`. A clear kills live subagents, so never while a
Running row has one. A turn that fails on a usage limit loses nothing on disk; after the reset the owner
sends `/manager` and the reconcile step turns orphaned Running rows into resumes.
