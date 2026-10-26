# <Project> roadmap

The planned features, in the order we intend to build them, and the status of each. This is the one place
to look for "what's next". A feature's specs, plans, handoffs and live status live in its task folder,
`docs/tasks/active/task-NNN-<slug>/` (`docs/tasks/README.md`); this file links to them.

## How to keep this file current

This file changes only in claim, planning and close commits on master
(`C:/code/agent-workflow/AGENT_PROTOCOL.md`), never on a task branch. Agents put their roadmap notes in their
task's `status.md`, and the close commit copies them here.

- **Every item has a status line:** `**Task:** <folder link> · **Status:** <state>` (a `BACKLOG` item has
  no task yet). The states and what each means are in `AGENT_PROTOCOL.md` → "Task states". A claimed
  item also names its owner and branch.
- **Claimed items** (`SPEC_IN_PROGRESS`, `IN_PROGRESS`, `REVIEW`, `BLOCKED`) sit under
  [In progress](#in-progress); the rest under [Next](#next) and [Later](#later).
- **Closing a task:** move it to [Shipped](#shipped) with the date, merge commit and its completed folder.
  Put the lasting decisions in the feature's own doc, not here.
- **Adding a feature:** put it where it logically belongs in the order, not at the end, and say why it
  sits there (what it depends on, what depends on it).
- **Changing the order or dropping a feature:** do it only when the owner decides, and write the date and
  reason next to the item. Dropped ideas go to [Out of scope](#out-of-scope) so nobody proposes them again.
- Keep each item short: why, scope, owner decisions already made, dependencies, open questions. The
  design itself belongs in its spec.
- **Follow-ups and small fixes** are task folders (`BACKLOG`, `status.md` as their spec), listed as one line
  under the feature they belong to, or under [Small fixes](#small-fixes-any-time) when they belong to none.
  A dropped one (`DROPPED`) leaves this file.
- **What waits on the owner** (decisions and actions) is in [`OWNER_QUEUE.md`](OWNER_QUEUE.md) as `Q-NNN`
  items; an item here names the `Q-` it waits for, never the question itself.

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
