# Manager board

The manager tab's memory (`~/.claude/skills/manager/SKILL.md`). It changes only in docs commits on master
from the main checkout (`docs(manager): board`), like the roadmap. A fresh tab reads it first; the owner
reads it for "where are we". The task folders stay the source of truth for each task's state; this file
says what the manager is doing about them, and in what order.

```
Autopilot: off
Remote control: off
Last tab stopped at: (none yet)
Next step: (none yet)
```

## Now

Feature: none.

## Running

One row per task with a live or resumable subagent. `Step` is `build`, `review`, `fix` or `reviewed`.
`Note` is `resume: <plan task>, <committed / uncommitted state>` once the agent is gone.

| Task | Plan task | Step | Agent | Branch | Since (UTC) | Note |
|---|---|---|---|---|---|---|

## Queue (in order)

One row per task folder, dispatched in this order; its plan tasks run in plan order on its one branch.
`Database` is yes when the plan adds a migration (the builder starts the branch database).

| Task | What (plan) | Agent | Database | After |
|---|---|---|---|---|

## Blocked

(none)

## Needs the owner

(none)

## Rulings

(none)

## Done this week

(none)
