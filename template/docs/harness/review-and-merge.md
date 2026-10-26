# Reviewing, merging, closing

<!--
source: v1 AGENT_PROTOCOL.md (reviewing and closing, cleanup), with v2's reviewer contract
applies: reviewers and the manager at a task's end
review-by: 2027-01-31
-->

The reviewer claims the task (`REVIEW`, `Owner` = the reviewer) and works in the task's worktree. In
orchestrated mode (`manager.md`) the reviewer is a dispatched read-only agent and the manager merges and
closes; in a separate tab one agent does all three.

## 1. Review

- The contract is `verification.md`: re-run the tier's checks, read the diff in context
  (`git diff master...task/task-NNN-<slug>` plus `status.md`), judge against the spec and `Done when:`,
  return `APPROVE` or `FIX` with findings the builder can apply.
- A reviewer that can edit (a separate tab, not a dispatched reviewer) still writes findings rather than
  fixing silently: for a small fix it may apply the fix itself with a test and say so in `status.md`; for
  anything larger it writes `handoff-review.md` on the branch, sets `Status: IN_PROGRESS`, `Owner: none`,
  commits, and tells the owner.
- **Before the whole-branch review's checks and before any gate**, master is merged into the branch and,
  when that changed the dependency lockfile, the install step of "Prepare a worktree" runs again (owner,
  2026-10-22). Who does it: the builder, on the manager's instruction, in orchestrated mode; the reviewing
  tab itself in a separate tab. A dispatched reviewer never does: it cannot edit.
- The whole-branch review re-runs the union of the tier commands of every plan task on the branch plus the
  integration files the feature touches, and, for a UI change, a browser pass of every changed page from the
  worktree's own dev server. The gate runs only in the merge command.

## 2. Merge

From the main checkout, with the project's merge command (Workflow settings → Merge) on
`task/task-NNN-<slug>`: it runs the gate and moves master only when that passes. A failed gate is fixed on
the branch, by the builder, from the gate's output. The merge queues behind another gate; waiting is normal.
If it stops and prints a command to run by hand, run that command.

## 3. Close

One docs commit on master from the main checkout, `docs(tasks): close task-NNN`:

- `status.md`: `Status: DONE`, the merge commit, the date.
- `docs/ROADMAP.md`: the entry moves to Shipped (date, merge commit, link to the completed folder); the
  `For the roadmap:` notes are copied: each follow-up becomes a small task folder, each owner question a `Q-`
  item in `docs/OWNER_QUEUE.md`.
- The follow-ups that name this task: `git grep -l "task-NNN" master -- docs/tasks/active/` finds every task
  whose `With:` or `After:` names it. Each is still needed (update it; an `After:` on this task is now met),
  already done by this task (`DONE` with this merge), or moot (`DROPPED`, say why). Move the last two to
  `completed/`.
- `git mv docs/tasks/active/task-NNN-<slug> docs/tasks/completed/`, then update every link to the old path
  (`git grep -l "tasks/active/task-NNN-"`), applied migrations excepted.
- The `close` ledger row, outcome `done` (`model-policy.md` → The ledger).

## 4. Clean up

```bash
git worktree remove <worktree>
git branch -d task/task-NNN-<slug>
# the project's branch database cleanup (Workflow settings → Branch database)
```

If Windows refuses to delete the folder because a session still has it open, say so; the owner closes that
session. A worktree whose task is `DONE` on master and that a close left behind is removed at the start of
the manager's next turn, without asking (owner, 2026-10-22).

Push master and task branches only as "Who pushes" says (owner, 2026-10-22). Where it says "only the
owner", never push. A production promote always needs the owner's yes in the session.
