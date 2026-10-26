---
paths:
  - "docs/tasks/**"
  - "docs/ROADMAP.md"
  - "docs/OWNER_QUEUE.md"
  - "docs/manager/board.md"
source: agent-workflow v2; loads only when a task file, the roadmap, the owner queue or the board is touched
applies: editing task folders and the planning files
review-by: 2027-01-31
---

# Task files

- **One folder per task:** `docs/tasks/active/task-NNN-<slug>/` with `status.md` (always), and
  `brief-<topic>.md`, `spec-<topic>.md`, `plan-<topic>.md`, `handoff-<topic>.md`, `research-<topic>.md`
  as needed. `NNN` is one past the highest number under `active/` and `completed/`, checked again right before
  the claim commit. Done or dropped folders live under `completed/` (`docs/harness/task-flow.md`).
- **`status.md` is the task's live state** and, for a small task, its spec. The format is
  `docs/harness/status-template.md`; the lines that matter: `Status`, `Owner`, `Branch`, `Touches`, `Tier`,
  `Done when`, `Evidence`, `Updated` (UTC), `Next step`. `Done when` names commands and observable results, never
  "tests pass".
- **`docs/ROADMAP.md` changes only in claim, planning and close commits on master**, from the main checkout.
  On a task branch, roadmap notes go under `For the roadmap:` in `status.md`; the close commit copies them.
- **States:** `BACKLOG`, `SPEC_IN_PROGRESS`, `SPECIFIED`, `IN_PROGRESS`, `REVIEW`, `BLOCKED`, `DONE`,
  `DROPPED`. A builder sets `REVIEW`; only a reviewer (or the manager closing) sets `DONE`.
- **`Q-NNN` items** in `docs/OWNER_QUEUE.md` hold what only the owner can decide or do: asked, blocks, by
  when, options, recommendation. A task waiting on one says `Blocked on: Q-NNN`.
- **Links:** a doc links to the task's current path; a migration cites the task by id and section
  (`-- spec: task-017 §5.2`), never by path.
