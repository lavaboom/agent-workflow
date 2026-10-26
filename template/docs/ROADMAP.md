# {{PROJECT}} roadmap

The planned features in the order we intend to build them, and the status of each: the one place to look
for "what's next" after the board. A feature's specs, plans, handoffs and live status live in its task
folder, `docs/tasks/active/task-NNN-<slug>/`; this file links to them.

## How to keep this file current

This file changes only in claim, planning and close commits on master (`docs/harness/task-flow.md`),
never on a task branch. Agents put their roadmap notes under `For the roadmap:` in their task's
`status.md`, and the close commit copies them here.

- **Every item has a status line:** `**Task:** <folder link> · **Status:** <state>` (a `BACKLOG` item may
  have no task yet). The states are in `docs/harness/task-flow.md`. A claimed item also names its owner
  and branch.
- **Claimed items** (`SPEC_IN_PROGRESS`, `IN_PROGRESS`, `REVIEW`, `BLOCKED`) sit under In progress; the rest
  under Next and Later.
- **Closing a task:** move it to Shipped with the date, merge commit and its completed folder. Lasting
  decisions go in the feature's own doc, not here.
- **Adding a feature:** where it logically belongs in the order, not at the end, with why it sits there.
- **Changing the order or dropping a feature:** only when the owner decides, with the date and reason.
  Dropped ideas go to Out of scope so nobody proposes them again.
- **Follow-ups and small fixes** are task folders (`BACKLOG`, `status.md` as their spec), one line under
  the feature they belong to, or under Small fixes when they belong to none.
- **What waits on the owner** is in `OWNER_QUEUE.md` as `Q-NNN` items; an item here names the `Q-` it
  waits for, never the question itself.

## Product principles every feature follows

1. <the principle, in one or two lines>

## In progress

(none)

## Next

### Small fixes, any time

(none)

## Later

(none)

## Out of scope

(none)

## Shipped

| Date | What | Merge |
|---|---|---|
