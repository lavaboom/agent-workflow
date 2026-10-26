# Building a task

<!--
source: v1 WORKFLOW.md (code philosophy) and AGENT_PROTOCOL.md (working on a task, finishing), plus v2's evidence rule
applies: every builder, every session that writes code
review-by: 2027-01-31
-->

## Code philosophy

Every piece of code must satisfy three properties, in this order:

1. **Testable.** Logic lives in functions with explicit inputs and outputs; no hidden side effects, no god
   components. Reads and writes of data live in modules of their own, so a page calls the data layer and the
   data layer calls the database, and each can be tested without rendering the page.
2. **Documentable.** Each module has one statable responsibility. If a file can't be described in one
   sentence, split it. File and function names are the primary documentation.
3. **Human readable.** Boring, explicit code over clever abstractions. Flat over nested; short functions over
   long ones. When these conflict with brevity or DRY, lean toward readability: duplication is acceptable,
   confusion is not.

**Fix root causes.** No quick fixes, patches or workarounds unless the owner asks. A hack that has to stay
becomes a `BACKLOG` task with a deadline, never a comment or a "later" (owner, 2026-10-22).

## Working on a task

1. In the worktree, read `status.md`, the spec, the plan, and the docs the "Docs a builder reads for a task"
   setting names. Read the plan task's `Tier:` and `Done when:` before writing a line: they are the contract
   you will be reviewed against (`verification.md`).
2. Follow the spec. Change it only when building shows a real problem; then edit it on the branch, say what
   changed and why, date it.
3. New specs, plans, handoffs and research go in the task folder with their prefix, whatever a skill's
   default location is.
4. Commit on the task branch as you go; update `status.md` (commit, evidence, notes) in the same commits.
5. Anything for the roadmap (a follow-up, an owner decision, an open question) goes under `For the roadmap:`
   in `status.md`. Don't edit `docs/ROADMAP.md` on the branch.
6. Stuck on something only the owner can decide or do: `Status: BLOCKED`, `Blocked on: …`, commit, stop.
7. If your session ends before the task is done, write where things stand and the next step in `status.md`,
   or a `handoff-<topic>.md` for anything longer (`session.md`).
8. **Stay in your lane.** Change only the paths `Touches:` names. A fix you need outside them is a follow-up
   task; when the task cannot be done without it, widen `Touches:` in `status.md`, commit that, and say so in
   your report. Never edit a path another running task's `Touches:` names (owner, 2026-10-22).
9. **Verify at the tier, no more and no less.** Run exactly the commands the tier names in `AGENTS.md`, plus
   the integration or browser files the task names. Record each command and its result under `Evidence:`.
   A `docs` or `static` task starts no database and runs no suite. Never write a check you did not run.
10. **Docs move with code.** A change that adds a feature, changes a data flow or decides an architecture
    updates the relevant doc in the same commit; the project's `docs/` is the reference for its codebase.
    Write for the next developer: short sentences, concrete examples, explicit gotchas.

## Finishing a task (builder)

1. If master moved since the branch was made, merge master into the branch and resolve conflicts there.
2. Run the tier's checks one last time on the merged branch; update `Evidence:`.
3. Commit everything. Set `Status: REVIEW`, `Owner: none (waiting for a reviewer)` (or the owner the
   dispatch named), with the last commit and the evidence.
4. Clean state (`session.md`): no debug leftovers, the readiness command passes, the worktree is left in place.
5. Stop. Don't merge, don't push, don't remove the worktree. Say the task is ready for review.

A follow-up noticed on the way is written down as a task when it is noticed (`task-flow.md` → Small tasks),
or listed under `For the roadmap:` when you cannot commit to master.
