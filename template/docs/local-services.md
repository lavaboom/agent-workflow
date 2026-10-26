# Local services

<!--
source: docs/harness/places.md → The shared machine; this file holds the project's values
applies: every builder and reviewer on this machine
review-by: <an ISO date a month after adoption>
-->

What every agent on this machine shares, and the rules for it (`docs/harness/places.md`).

## Shared services agents never restart without the owner's yes

| Service | What it serves | What counts as a restart |
|---|---|---|
| <e.g. the local database stack> | <every test run and dev server> | <e.g. `supabase stop`, `docker compose down`, `supabase db reset`> |

## Test users

- The shared dev test user: <who it is, for reading pages only>.
- Your own test user for checks that write: <how to create one, how it is removed when the task is done>.

## Dev server per worktree

- Command: <the dev server command, run from the worktree>.
- Port: <how a task picks a port of its own, e.g. 3000 + task number>.
- Claude desktop app: a temporary `.claude/launch.json` configuration named `task-NNN`, restored with
  `git checkout -- .claude/launch.json` right after `preview_start`.

## Branch databases

<how a task with a migration starts and stops its own database (the Branch database setting), or "(none)">
