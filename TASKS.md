# Tasks

Every task's documents live in one folder: its specs, plans, handoffs, research and status. How agents
claim, build, review and close a task is in `AGENT_PROTOCOL.md` (next to this file); which tasks exist and
their status is in the project's `docs/ROADMAP.md`. A project's `docs/tasks/README.md` points here and keeps
only its own history.

## Layout

```
docs/tasks/
  active/<task>/       not done yet: BACKLOG through REVIEW, or BLOCKED
  completed/<task>/    DONE (merged into master) or DROPPED (not needed; status.md says why)
```

A small task or follow-up is a folder holding only `status.md`, which is its spec (`AGENT_PROTOCOL.md`
→ "Small tasks and follow-ups"). What waits on the owner is in `docs/OWNER_QUEUE.md`.

## Names

- **Task:** `task-NNN-<slug>`, e.g. `task-017-spreadsheet-import`. `NNN` is the next number after the
  highest one under `active/` and `completed/`. A folder is created in a claim or planning commit on
  master, so the next agent sees the number is taken.
- **Branch:** `task/task-NNN-<slug>`. **Worktree:** the project's Worktrees setting (its `AGENTS.md` →
  "Workflow settings"), for example `../<project>-worktrees/task-NNN-<slug>/`.
- **Files in a task folder:**

| File | Holds |
|---|---|
| `brief-<topic>.md` | The feature's high-level plan in the user's words, release by release, with the decisions tagged `(owner, date)` / `(manager, date)`; approved by the owner before any spec (the manager, `AGENT_PROTOCOL.md` → "Orchestrated mode"). |
| `spec-<topic>.md` | The design: what and why. The authoritative spec for the task. |
| `plan-<topic>.md` | How to build it, step by step. |
| `handoff-<topic>.md` | What the next session needs: where things stand, what's next, open questions. |
| `research-<topic>.md` | A comparison, brainstorm or inventory that informs a spec. |
| `status.md` | Who owns the task, its status, branch, last commit, tests; the build log. For a small task, also its spec. |

A task with several specs or plans gives each its own topic (`plan-phase-a-prerequisites.md`).

## Linking to a task's documents

A folder moves from `active/` to `completed/` when its task is done, so a link to it changes once.

- Docs and code comments link to the file's current path. The close commit updates links to
  `docs/tasks/active/task-NNN-…` when it moves the folder (see `AGENT_PROTOCOL.md` → "Reviewing and closing").
- A migration can never be edited after it is applied, so a migration cites the task by its ID and
  section (`-- spec: task-017 §5.2`), not by a path.
