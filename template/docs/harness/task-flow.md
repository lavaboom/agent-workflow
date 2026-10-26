# Task flow

<!--
source: v1 AGENT_PROTOCOL.md (sources of truth, task states, picking up, claiming, planning without building, small tasks, groups), trimmed
applies: claiming, creating or planning a task
review-by: 2027-01-31
-->

The owner starts an agent with "pick up task-017" or "work on the tax export". That is enough: the agent
follows "Picking up a task", claims the task itself if nobody has, and works in the task's own worktree
(`places.md`). Commands and paths that differ between projects are the Workflow settings in `AGENTS.md`.

## Sources of truth

| What | Where | Written by |
|---|---|---|
| Which tasks exist, their order and status | `docs/ROADMAP.md` on **master** | claim, planning and close commits only |
| A task's design | `docs/tasks/<active or completed>/<task>/spec-*.md` | whoever specs the task |
| A task's live state: owner, branch, commit, tier, evidence, notes | `<task>/status.md` | the claim and close commits; the task's owner in between, on its branch |

Master is the **local** main branch (Workflow settings → Main branch; `master` here stands for it);
`git show master:<path>` reads the current version from any worktree. Never create a second spec for a task that has one.

## Task states

| State | Meaning |
|---|---|
| `BACKLOG` | On the roadmap; nobody is working on it. |
| `SPEC_IN_PROGRESS` | Claimed; its spec is being written. |
| `SPECIFIED` | The spec is approved by the owner; nobody is building it yet. |
| `IN_PROGRESS` | Claimed; being built. |
| `REVIEW` | Built and committed; waiting for or under review (`status.md` names the reviewer). |
| `BLOCKED` | Can't move until `Blocked on: …` happens, usually an owner decision or action. |
| `DONE` | Merged into master; the folder is under `docs/tasks/completed/`. |
| `DROPPED` | Not needed any more; `status.md` says why; the folder is under `completed/`. |

Only a reviewer, or the manager at the close, sets `DONE`. A builder sets at most `REVIEW` or `BLOCKED`.

## Picking up a task

1. Find it on master: `git show master:docs/ROADMAP.md` and its folder's `status.md`. When the task has a
   branch (`git branch --list "task/task-NNN-*"`), read `status.md` from the branch: it holds the current
   state; master's copy is the claim.
2. Decide from state and owner:

   | Master shows | Do |
   |---|---|
   | `BACKLOG` with `Blocked on: Q-NNN` still open, or `After:` a task not yet `DONE` | Say what it waits for; stop. |
   | `BACKLOG`, `SPECIFIED`, or no folder yet | Claim it as its builder (`IN_PROGRESS`, or `SPEC_IN_PROGRESS` without an approved spec). Asked only to spec or plan: "Planning without building". |
   | `REVIEW` with no reviewer | Claim it as its reviewer; the state stays `REVIEW`; then `review-and-merge.md`. |
   | Owned by another agent | Don't touch it; say who has it; stop, unless the owner says to take it over in this session (then claim again and name whom you replaced). |
   | `BLOCKED` | Say what it is blocked on; stop. |
   | `DONE` or `DROPPED` | Say so; stop. |

3. Asked by description ("fix the duplicate-units thing"): `git grep -il "<words>" master -- docs/tasks/active/`
   and the roadmap; name what you found and ask the owner to confirm before claiming. Nothing matches: write
   it down as a new small task first and say its id.
4. Already yours (your `Owner` name, or the owner says so): skip the claim, go to the worktree.

## Claiming

In the main checkout, by whoever picks the task up. A task that already has a branch is claimed on that
branch (open or recreate its worktree, set yourself as `Owner`, commit `docs(tasks): task-NNN taken by
<owner>` there) and master is left alone. For a task with no branch yet:

1. `git branch --show-current` is `master`; `git status --short` shows no changes to `docs/ROADMAP.md` or
   the task folder. Otherwise stop and ask: the main checkout may hold someone else's work.
2. Create `docs/tasks/active/task-NNN-<slug>/` if needed, numbered one past the highest under `active/`
   and `completed/`.
3. Write `status.md` (`status-template.md`): state, you as `Owner`, branch, worktree, `Touches:`, `Tier:`,
   `Done when:`.
4. Update the roadmap entry (folder, state, owner, branch); a claimed task sits under "In progress".
5. Right before committing, check master once more: `status.md` unchanged since step 1 of "Picking up"
   (else someone claimed it; undo and stop), and the number still free
   (`git ls-tree --name-only master docs/tasks/active/ docs/tasks/completed/ | grep "task-NNN-"`; renumber if
   taken). Run the project's "Check before a docs commit" when it has one. Then:

   ```bash
   git add docs/tasks/active/task-NNN-<slug>/
   git commit -m "docs(tasks): claim task-NNN for <owner>" -- docs/ROADMAP.md docs/tasks/active/task-NNN-<slug>/
   ```
6. `git worktree add <worktree> -b task/task-NNN-<slug> master` (drop `-b` when the branch exists).
7. Prepare it as the "Prepare a worktree" setting says; start a branch database only when the task adds or
   changes a migration.
8. From now on, work only in the worktree.

## Planning without building

A spec or plan for a task nobody is building happens on master, in the main checkout, no branch: docs only,
visible to everyone at once. If it needs code (a prototype, an experiment), claim as a builder instead.

1. Claim it `SPEC_IN_PROGRESS` (steps 1 to 5; no worktree). A roadmap item the owner just asked for is added
   in the same commit.
2. Touch only the task folder and its roadmap entry.
3. **Commit after every edit, naming your paths**, and never stop with uncommitted changes: the main checkout
   is shared, and an uncommitted roadmap edit blocks every other claim.
4. Name files `spec-<topic>.md`, `plan-<topic>.md`, `research-<topic>.md`, whatever the skill you use would
   suggest. Every plan task carries its tier and its `Done when:` commands (`verification.md`).
5. When the owner approves the spec: `Status: SPECIFIED`, `Owner: none`, the roadmap entry `SPECIFIED`, one
   last commit.

## Small tasks and follow-ups

A follow-up, a small fix or a chip is written down the moment it is noticed, so it has an id and shows on
the roadmap for Claude and Codex alike.

1. A planning commit on master: a folder holding only `status.md` (`BACKLOG`, `Owner: none`, `Tier`,
   `Done when`), and a one-line roadmap entry **under the feature it belongs to** (or "Small fixes, any
   time"). On a task branch you can't commit to master: list it under `For the roadmap:` and the close
   commit writes it down.
2. Its `status.md` is its spec. If it can't be said in that block, it needs a real spec.
3. A chip (`spawn_task`) is only a pointer: "pick up task-NNN".
4. Before fixing, confirm it still exists: `git log --oneline --since=<Created> -- <Touches>` and reproduce.
   Gone already: `DROPPED` (or `DONE` naming the commit), folder to `completed/`, say so.
5. A builder claiming a big task lists the tasks whose `With:` names it; small ones in the same files it may
   fold in (say so in both `status.md` files).
6. Grooming ("groom the backlog"): re-check every `BACKLOG` small task older than two weeks the same way.
7. **When you create tasks, tell the owner what each needs** (owner, 2026-10-05): a spec, a plan, both, or
   straight from its `status.md`; for one buildable now, the tier and the builder model and effort from the
   ladder (`model-policy.md`); which can run concurrently and which must wait, with `After:` saying the same.

## Groups

Small ready tasks that belong together are built in one session by one agent and reviewed by one reviewer
(owner, 2026-10-07).

1. **When:** the same files, function or migration, or the same feature; two to five tasks; none needing a
   spec, blocked, or waiting on unfinished work. Two tasks changing the same database object are one group
   or run one after the other, never side by side (owner, 2026-10-22).
2. **Writing it down:** one lead; each member's `status.md` gets
   `Group: <name> (lead task-NNN; with task-…): <agent>, <why together>` under `With:`; roadmap lines say
   `Group <x>`; the reply to the owner lists lead, members, agent (the highest any member needs) and which
   groups can run side by side.
3. **Building:** "pick up task-NNN" for the lead claims every member in one commit (all `IN_PROGRESS`, one
   `Owner`, the lead's branch and worktree). Confirm each member still exists first. Build members one at a
   time, commits naming their task id; a member that turns out bigger goes back to `BACKLOG` with a note.
   When done, every member is `REVIEW` in one commit.
4. **Reviewing and closing:** one reviewer claims every member, reviews the lead's branch against each
   member's `Done when:`, merges once, closes every member in one commit.
