# Sessions: clock in, clock out, clean state

<!--
source: lectures 5, 6 and 12 of the harness course (continuity, initialisation, clean state) and their templates; v1's handoff rules
applies: the start and the end of every session, builder, reviewer or manager
review-by: 2027-01-31
-->

A session's memory is wiped when it ends; the repository's is not. Treat every session as a shift: read the
shift notes at the start, write them at the end.

## Clock in

1. `AGENTS.md` → Start here: the board's `Next step:` and `Current issues:`, the roadmap's In progress
   section, the open `Q-` items, your task's `status.md` (from its branch when it has one).
2. Run the readiness command (`AGENTS.md` → Commands). A failing baseline is fixed before any new work: a
   feature built on a broken checkout is not verified.
3. Pick up the task you were given (`task-flow.md`), or, in the manager tab, run `/manager`.
4. Work on one task until it is verified or `BLOCKED`. Do not start a second one "while you are there".

## Clock out

Before the session ends, or before it hands off:

1. `status.md`: `Commit`, `Evidence` (the checks run and their results), `Notes` (what changed and why),
   the next step, `Updated`. Commit it with your paths.
2. **Clean state:** the readiness command passes; no debug leftovers (`console.log`, commented-out code,
   stray files, TODOs without a task id); no uncommitted changes in the main checkout; the worktree is left
   in place for the reviewer.
3. **Unfinished work** gets `handoff-<topic>.md` in the task folder:

   ```
   ## Verified now        what works and which checks proved it
   ## Changed this session
   ## Broken or unverified   known defects, paths not exercised, risks
   ## Next best step      the one thing to do next, what counts as passing, what must not change
   ## Commands            start, verify, the focused debug command
   ```
4. Follow-ups under `For the roadmap:`; owner questions as `Q-` items when you can commit on master.
5. The manager also writes the board (`Next step:`, `Current issues:`) and commits it.

`/clock-out` (`.claude/skills/clock-out/`) walks this list.

## Context limits

- Hand off before the second half of a long task, not after: at about 60 % context, write `status.md` or the
  handoff, commit, and `/clear`. A fresh session that reads a good handoff is cheaper than a tired one.
- Compaction keeps the what and loses the why; the why lives in the spec's Decisions and in `status.md`
  Notes, so write it there before the context is compacted.
- A dispatched builder that runs out of context reports that it did; the manager splits the next plan task.

## The fresh-session test

Once a week (`maintenance.md`), open a session with no verbal context and ask: what is this system, how is it
organised, how do I run it, how do I verify it, what is in progress and what is next. Every question it
cannot answer from the repository names a file to fix.
