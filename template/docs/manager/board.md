# Manager board

The manager tab's memory (`.claude/skills/manager/SKILL.md`; `docs/harness/manager.md` → The board). It
changes only in docs commits on master from the main checkout (`docs(manager): board`). A fresh tab reads
it first; the owner reads it for "where are we". The first three lines are mandatory and are what any fresh
session reads before anything else.

```
Next step: <the one thing the next turn does>
Current issues: <what is broken or blocked right now, one line each, or "none">
Autopilot: off
```

## Now

Feature: none.

## Running

One row per task with a live or resumable subagent. `Step` is `build`, `review`, `fix` or `reviewed`.
`Note` is `resume: <plan task>, <committed / uncommitted state>` once the agent is gone.

| Task | Plan task | Step | Model/effort | Branch | Since (UTC) | Note |
|---|---|---|---|---|---|---|

## Queue (in order)

One row per task folder, dispatched in this order; its plan tasks run in plan order on its one branch.
`Database` is yes when the plan adds a migration.

| Task | What (plan) | First model/effort | Database | After |
|---|---|---|---|---|

## Blocked

(none)

## Needs the owner

(none)

## Rulings

(none)

## Done this week

(none)
