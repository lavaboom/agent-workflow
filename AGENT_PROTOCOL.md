# Agent Protocol

How Claude and Codex agents share work on a project without stepping on each other. It applies to
every agent and subagent. The folder layout and file names are in `TASKS.md` (next to this file).

Commands, paths and lists that differ between projects are the project's **Workflow settings** (its
`AGENTS.md` → "Workflow settings"); this file names them by setting, for example "the project's merge command
(Workflow settings → Merge)". In a command, `<worktree>` is the task's worktree as the Worktrees setting gives
it, for example `../<project>-worktrees/task-NNN-<slug>`.

The owner starts an agent with something like "pick up task-017" or "work on the tax export". That is
enough: the agent follows "Picking up a task" below, claims the task itself if nobody has, and works in the
task's own worktree.

## Sources of truth

| What | Where | Written by |
|---|---|---|
| Which tasks exist, their order and status | `docs/ROADMAP.md` on **master** | claim, planning and close commits only (below) |
| A task's design | `docs/tasks/<active or completed>/<task>/spec-*.md` | whoever specs the task |
| A task's live state: owner, branch, last commit, tests, notes | `<task>/status.md` | the claim and close commits; the task's owner in between, on its branch (on master while only planning) |

Master here means the **local** `master` branch. Every worktree shares it, so `git show master:<path>` shows
the current version of a file from anywhere. Never create a second spec for a task that has one.

## Places

- **Main checkout** (Workflow settings → Main checkout), on `master`: only docs commits for claims, closes and
  planning ("Planning without building"), and the project's merge command (Workflow settings → Merge). Never
  write code here or commit anything else to master. Other agents' uncommitted work may be in it, so commit
  only your own paths (`git commit -- <paths>`); never `git add -A`, `git add .` or `git commit -a` here.
- **The task's worktree** (Workflow settings → Worktrees) on branch `task/task-NNN-<slug>`: all
  other work: code, tests, the specs and plans written while building, `status.md` updates.
- **The folder your session opened in doesn't count.** A desktop-app session stays in the folder it started
  in: the main checkout, or a worktree the app made under `.claude/worktrees/`. After claiming, do every file
  edit and run every command in the task's worktree, by its full path (or switch the session's working folder
  to it if the app offers that). Never work in an app-made `.claude/worktrees/` folder.

## Task states

| State | Meaning |
|---|---|
| `BACKLOG` | On the roadmap; nobody is working on it. |
| `SPEC_IN_PROGRESS` | Claimed; its spec is being written. |
| `SPECIFIED` | The spec is approved by the owner; nobody is building it yet. |
| `IN_PROGRESS` | Claimed; being built. |
| `REVIEW` | Built and committed; waiting for a reviewer, or being reviewed (then `status.md` names the reviewer). |
| `BLOCKED` | Can't move until something named in `status.md` ("Blocked on: …") happens, usually an owner decision or action. |
| `DONE` | Merged into master; the folder is under `docs/tasks/completed/`. |
| `DROPPED` | Not needed any more (another task made it moot, or the owner ruled it out); `status.md` says why. The folder is under `docs/tasks/completed/`. |

A big roadmap item may have no folder yet; it gets one, and an ID, when someone claims or plans it. A small
task or follow-up gets its folder when it is written down ("Small tasks and follow-ups").

## Picking up a task

1. Find the task on master: `git show master:docs/ROADMAP.md`, and its folder's `status.md`. Read
   `status.md` from the task's branch when it has one (`git branch --list "task/task-NNN-*"`):
   `git show task/task-NNN-<slug>:docs/tasks/active/task-NNN-<slug>/status.md`. The branch holds the
   current state (a builder sets `REVIEW` there); master's copy is the claim and the roadmap shows the
   state at the claim. Otherwise read master's copy. A roadmap item with no folder is unclaimed.
2. Decide from its state and owner:

   | Master shows | Do |
   |---|---|
   | `BACKLOG` with `Blocked on: Q-NNN` still open in `docs/OWNER_QUEUE.md`, or `After:` a task not yet `DONE` | Tell the owner what it waits for, and stop. |
   | `BACKLOG` or `SPECIFIED`, or no folder yet | Claim it ("Claiming", below) as its builder: `IN_PROGRESS`, or `SPEC_IN_PROGRESS` if it has no approved spec. Asked only to spec or plan it: "Planning without building". |
   | `REVIEW` with no reviewer | Claim it as its reviewer: `Owner` is you, the state stays `REVIEW`. Then follow "Reviewing and closing". |
   | Owned by another agent (`SPEC_IN_PROGRESS`, `IN_PROGRESS`, or `REVIEW` with a reviewer) | Don't touch it. Tell the owner who has it, and stop, unless the owner tells you in this session to take it over; then claim it again with you as `Owner` and say whom you replaced in the notes. |
   | `BLOCKED` | Tell the owner what it is blocked on (from `status.md`), and stop. |
   | `DONE` or `DROPPED`, or under `docs/tasks/completed/` | Tell the owner it is done (or why it was dropped), and stop. |

3. **Asked by description, not by ID** ("fix the duplicate-units thing"): search the task folders
   (`git grep -il "<words>" master -- docs/tasks/active/`) and the roadmap, name the task you found, and
   ask the owner to confirm before claiming. If nothing matches, write it down as a new small task first
   ("Small tasks and follow-ups") and say its ID.
4. If the task is already yours (your `Owner` name, or the owner says so), skip the claim and go to its worktree.

## Claiming

Done in the main checkout, by whoever picks the task up.

**A task that already has a branch** (a reviewer taking a `REVIEW` task, or a builder resuming one) is
claimed on that branch instead: open its worktree (create it with
`git worktree add <worktree> task/task-NNN-<slug>` if it is gone, then step 7),
set yourself as `Owner` in its `status.md`, and commit that there
(`docs(tasks): task-NNN taken by <owner>`). Leave master and the roadmap alone: a second copy of
`status.md` on master would conflict with the branch's at the merge. The steps below are for a task with
no branch yet.

1. Check the main checkout is on `master` (`git branch --show-current`) and that `docs/ROADMAP.md` and the
   task's folder have no uncommitted changes (`git status --short`). If either check fails, stop and ask the
   owner: the main checkout may hold someone else's work.
2. If the task has no folder, create `docs/tasks/active/task-NNN-<slug>/`, numbering it one past the highest
   number under `docs/tasks/active/` and `docs/tasks/completed/`.
3. Write `status.md` (format below): the state, you as `Owner`, the branch and the worktree.
4. Update the task's roadmap entry: the task folder, the state, the owner, the branch. A claimed task sits
   under "In progress".
5. Check master once more, right before committing:
   - If `git show master:docs/tasks/active/task-NNN-<slug>/status.md` changed since "Picking up a task"
     step 1, someone else claimed it; undo your edits and stop.
   - If you created a new folder, check its number is still free on master:
     `git ls-tree --name-only master docs/tasks/active/ docs/tasks/completed/ | grep "task-NNN-"`. Any
     result means another agent took the number while you worked (two new tasks started at once, e.g. two
     chips); renumber your folder to the next free number, fix the number in `status.md` and the roadmap
     entry, and check again.

   Then commit only those two paths:

   ```bash
   git commit -m "docs(tasks): claim task-NNN for <owner>" -- docs/ROADMAP.md docs/tasks/active/task-NNN-<slug>/
   ```

   (Stage a new folder first with `git add docs/tasks/active/task-NNN-<slug>/`.)
6. Create the worktree from master, unless it already exists:

   ```bash
   git worktree add <worktree> -b task/task-NNN-<slug> master
   ```

   If the branch already exists (a task picked up again), drop `-b` and name the branch instead.
7. Prepare it as the project's "Prepare a worktree" setting says. If the task adds or changes a migration,
   start its own database there (Workflow settings → Branch database).
8. From now on, work only in the worktree ("Places").

## Planning without building

Writing a spec or plan for a task nobody is building yet happens on master, in the main checkout, with no
branch or worktree: it is docs only, and everyone sees the draft at once. If writing it needs code (a
prototype, an experiment against a database), claim the task as a builder and use a worktree instead.

1. **Claim it as `SPEC_IN_PROGRESS`** with the "Claiming" steps 1 to 5 (the folder, `status.md` with you as
   `Owner`, the roadmap entry, the claim commit), and skip the worktree (steps 6 to 8). Nobody else specs or
   builds the task meanwhile. A roadmap item the owner has just asked for is added in the same commit.
2. **Touch only your task's folder and its roadmap entry.**
3. **Commit after every edit, naming your paths**, and never stop with uncommitted changes, even mid-way
   through a conversation with the owner. The main checkout is shared: uncommitted files there can be swept
   into another agent's commit, and an uncommitted roadmap edit blocks every other agent's claim. Before the
   commit, run the project's "Check before a docs commit" (Workflow settings), when it has one: specs often
   quote real documents.

   ```bash
   git add docs/tasks/active/task-NNN-<slug>/ docs/ROADMAP.md
   # the project's "Check before a docs commit", if any
   git commit -m "docs(tasks): task-NNN spec: <what changed>" -- docs/tasks/active/task-NNN-<slug>/ docs/ROADMAP.md
   ```
4. **Name the files** `spec-<topic>.md`, `plan-<topic>.md` or `research-<topic>.md`, whatever the skill you
   use (`superpowers:brainstorming`, `superpowers:writing-plans`) suggests.
5. **When the owner approves the spec**, set `status.md` to `Status: SPECIFIED`, `Owner: none`, and the
   roadmap entry to `SPECIFIED`, in one last commit. Whoever picks the task up later claims it as its
   builder and gets a worktree then; its branch starts from master, so it has the spec.

## Small tasks and follow-ups

A follow-up, a small fix or a chip is written down as a task the moment someone notices it, so that it has
an ID ("pick up task-NNN"), shows on the roadmap, and is visible to Claude and Codex alike.

1. **Write it down** with a planning commit on master ("Planning without building", steps 1 to 3, with
   `Status: BACKLOG` and `Owner: none`): a folder `docs/tasks/active/task-NNN-<slug>/` holding only
   `status.md`, and a one-line roadmap entry **under the feature it belongs to** (or under "Small fixes,
   any time" when it belongs to none). An agent on a task branch can't commit to master: it lists the
   follow-up under "For the roadmap" in its `status.md`, and the close commit writes it down.
2. **Its `status.md` is its spec.** If it can't be said this briefly, it needs a real spec:

   ```
   Task: task-023-pm-same-amount-units
   Status: BACKLOG
   Owner: none
   Created: 2026-10-03, from <the task or review that found it>
   With: task-019        # same files or area: cheapest done by that task's builder, or right after it
   After: (none)         # can't start before these are DONE
   Blocked on: (none)    # an open owner question, e.g. Q-007
   Touches: src/lib/pm-statements/extract.ts

   Problem: what is wrong, in two or three lines.
   Evidence: where it shows (a warning, a test, a review note).
   Done when: the check that proves it fixed.
   Not in scope: what not to do here.
   ```
3. **A chip is only a pointer.** Chips live in one app's interface, so Codex and other tabs can't see them
   and a dismissed chip is lost. Write the task down first; a chip, if any, says "pick up task-NNN".
4. **Before fixing, confirm it still exists.** A small task can go stale while it waits. The agent that
   picks it up first runs `git log --oneline --since=<Created> -- <Touches>` and reproduces the problem or
   reads the code. If it is already gone, it sets `DROPPED` (or `DONE`, naming the commit that fixed it),
   moves the folder to `completed/`, and says so.
5. **A builder claiming a big task** lists the tasks whose `With:` names it. Small ones in the same files
   it may fold in (say so in both `status.md` files); the rest it leaves.
6. **Grooming, when the owner asks** ("groom the backlog"): re-check every `BACKLOG` small task older than
   two weeks the same way, and drop or update it.
7. **Not for wording.** Until 1.0, no task, follow-up or `Q-` item is about how public-facing text is
   worded (`WORKFLOW.md` → "Until 1.0, tasks are about code, not wording"); it all gets one review before launch.

## Groups

Small tasks that are ready to build and belong together are built in one session by one agent, and
reviewed by one reviewer (owner, 2026-10-07): a worker and a reviewer session per two-line fix is too many.

1. **When to group.** Whoever creates or lists tasks that can be implemented straight from their
   `status.md` (no spec or plan needed) groups the related ones: the same files, the same function or
   migration, or the same feature, small enough together for one session (two to five tasks). Tasks that
   need a spec or plan, are blocked, or wait (`After:`) on unfinished work stay out until they are ready. Two
   tasks that replace the same SQL function belong in one group (one migration replaces it once) or must be
   built one after the other, never side by side.
2. **Writing it down.** One task is the lead. Each member's `status.md` gets a line under `With:`:
   `Group: <letter or name> (the lead | lead task-NNN; with task-…): <the agent>, <why together>`, and the
   roadmap lines say `Group <x>`. The reply to the owner lists each group: lead, members, agent (the
   highest any member needs: the agent table in `claude/CLAUDE.md`) and which groups can run side by side.
3. **Building.** "Pick up task-NNN" for the lead (or any member) claims the whole group in one claim
   commit: every member `IN_PROGRESS` with the same `Owner`, and the lead's branch and worktree
   (`task/task-<lead>-<slug>`). First confirm each member still exists ("Small tasks and follow-ups", step
   4); one already gone is set `DONE` or `DROPPED` in that commit and left out. Build members one at a time,
   one commit or more per member, each commit message naming its task id; a member that turns out to need
   a spec, or much more work than its `status.md` says, goes back to `BACKLOG` with a note, and the rest
   carry on. When done, every member is set `REVIEW` in one commit.
4. **Reviewing and closing.** One reviewer claims every member, reviews the lead's branch against each
   member's "Done when", merges it with one run of the project's merge command, and closes every member in one
   close commit ("Reviewing and closing", step 3, for each).

## Orchestrated mode: the manager

The owner runs the flow from one pinned tab, the manager (`/manager`, `~/.claude/skills/manager/SKILL.md`, the
shared repo's `claude/skills/manager/`; owner, 2026-10-10). The roles above do not change; what changes is who
plays them.

- **The manager** is the planner, the claimer, the reviewer of record and the closer. It claims
  (`Owner: claude:manager`; the claim commit, the worktree and its preparation's copy step), writes the brief,
  the specs and the plans on master, dispatches a subagent per plan task and per review, writes down the
  follow-ups a report names ("Small tasks and follow-ups", on master, at once), merges with
  the project's merge command, closes, and keeps its own state in `docs/manager/board.md` (a docs file on
  master, changed only from the main checkout, like the roadmap). It reads reports, never code or diffs.
- **A builder subagent** is the builder of one plan task or one small task: it runs the install step of
  "Prepare a worktree" and the branch database if the plan needs one, works in the task's worktree, commits
  with `status.md` updated ("Working on a task"), sets `REVIEW` with `Owner: claude:manager` after the task's
  last plan task ("Finishing a task"), or `BLOCKED` with `Blocked on:` when it needs a decision. It reports;
  it never asks, merges or pushes. A ruling or a spec change for a task that has a branch is made on that
  branch, by the builder on the manager's instruction, never on master's copy.
- **A reviewer subagent** reviews one plan task (spec compliance, then code quality, in one dispatch), or
  the whole branch before the merge, and reports a verdict; small fixes it makes on the branch itself.
  Every review is by Opus (`opus-high`, or `opus-xhigh` when the task was built at xhigh or the branch is in
  one of the project's hard areas (a migration included) or has concurrency; owner, 2026-10-13, replacing the
  2026-10-12 Fable-reviewer rule). Fable writes the specs and plans in the manager tab and never runs as a
  subagent (`claude/CLAUDE.md` → the agent table).
- **A brief** (`brief-<topic>.md`, `TASKS.md`) is the feature's high-level plan in the
  product user's words, approved by the owner before any spec. Its `Approvals:` line says whether the owner
  also approves the spec; by default only the brief.
- **Decisions are tagged** `(owner, <date>)` or `(manager, <date>)` in the spec. A subagent decides
  nothing a user would notice.
- **Capacity is checked before every dispatch:** the project's capacity command (Workflow settings →
  Capacity: free RAM, running branch databases, task worktrees, the gate). Its verdicts: `dispatch`,
  `dispatch-without-stack` (a task that adds a migration waits), `wait`.
- **Other tabs work as before.** "Pick up task-NNN" in a separate tab is unchanged; the manager respects
  `Owner:` like anyone and never dispatches a task another tab owns. Chips are not needed in this mode.

## The owner queue

`docs/OWNER_QUEUE.md` lists every open decision and action only the owner can take, numbered `Q-NNN`,
sorted so the ones blocking the most work come first.

- **Only what needs the owner goes here** (owner, 2026-10-06): a decision, or an action that needs the owner's
  identity, accounts, money or devices. A step an agent can run itself (a command, a script, a download, a dev
  server, a workflow dispatch, a push) is not a `Q-` item: the agent asks the owner's permission in chat, with
  what it will run, change and cost, and then does it (`WORKFLOW.md` → "What an agent can do itself").

- **When you hit one, add a `Q-` item** (what is asked, what it blocks, by when, the options and your
  recommendation) in a docs commit on master naming only that file; never leave it only inside a spec. On
  a task branch, put it under "For the roadmap" in `status.md` instead. A task that can't move without the
  answer is `BLOCKED` with `Blocked on: Q-NNN`; an unclaimed one keeps `BACKLOG` and the same line.
- **When the owner answers** (in chat or in the file), record the answer and date on the item, move it to
  "Answered", write the decision into the spec or doc it belongs in, and unblock the tasks that name it.
- Numbering: one past the highest `Q-` number in the file, checked again right before committing.

## status.md

```
Task: task-017-spreadsheet-import
Status: IN_PROGRESS
Owner: claude:<short name>
Branch: task/task-017-spreadsheet-import
Worktree: ../<project>-worktrees/task-017-spreadsheet-import
Commit: a94c023
Tests: unit PASS (1,402); integration PASS (spreadsheet-import.integration.test.ts)
Updated: 2026-10-02T18:40Z

Notes:
- Added the CSV parser and 14 unit tests.
- No migration.

For the roadmap:
- (follow-ups, owner decisions or open questions to copy to docs/ROADMAP.md at the close)
```

`Owner` is `claude:` or `codex:` plus a short name you pick and say to the owner (for example
`claude:task-017-review`), so the owner can tell agents apart on the roadmap. Times are UTC.

## Working on a task

1. In the worktree, read the task's `status.md`, its spec and its plan.
2. Follow the spec. Change it only when building it shows a real problem; then edit the spec, say what
   changed and why, and date it.
3. New specs, plans, handoffs and research go in the task folder with their prefix
   (`TASKS.md`), whatever a skill's default location is.
4. Commit on the task branch as you go. Update `status.md` (commit, tests, notes) in the same commits.
5. Anything for the roadmap (a follow-up, an owner decision, an open question) goes under "For the
   roadmap" in `status.md`. Don't edit `docs/ROADMAP.md` on the branch: every branch would conflict on it.
6. If you are stuck on something only the owner can decide or do, set `Status: BLOCKED`, write
   "Blocked on: …" in the notes, commit, and stop.
7. If your session ends before the task is done, write in `status.md` where things stand and the next
   step, or a `handoff-<topic>.md` for anything longer. A new session starts from it.

## Finishing a task (builder)

1. If master moved since the branch was made, merge master into the branch and resolve conflicts there.
2. Run the gates for what you changed: the project's builder checks (Workflow settings → Builder checks; the
   project's `AGENTS.md` says how its tests run), with the integration files that exercise your change on your
   own branch database if you added a migration. A UI change also meets the project's UI definition of done
   (named among the rules in Workflow settings → "Rules every builder prompt names").
3. Commit everything. Set `status.md` to `Status: REVIEW`, `Owner: none (waiting for a reviewer)`, with the
   last commit and the test results.
4. Stop. Don't merge, don't push, don't remove the worktree. Tell the owner the task is ready for review.

## Reviewing and closing

The reviewer claims the task (`REVIEW`, `Owner` = the reviewer) and works in the task's worktree.

1. **Review** the branch against its spec: `git diff master...task/task-NNN-<slug>`, plus `status.md`.
   A task merged before its review (task-017) is reviewed from the commits its handoff lists instead; its
   branch, made fresh from master, holds only the review's fixes.
   - Small fixes: make them on the task branch yourself, with tests.
   - Larger changes: write them in `handoff-review.md` on the branch, set `Status: IN_PROGRESS`,
     `Owner: none`, commit, and tell the owner; a builder picks it up again.
2. **Merge**, from the main checkout, with the project's merge command (Workflow settings → Merge) on
   `task/task-NNN-<slug>` (it runs the project's gate and moves master only if that passes). A failed gate is
   fixed on the branch.
3. **Close**, in one docs commit on master from the main checkout (`docs(tasks): close task-NNN`):
   - `status.md`: `Status: DONE`, the merge commit, the date.
   - `docs/ROADMAP.md`: move the entry to Shipped (date, merge commit, link to the completed folder) and
     copy over the "For the roadmap" notes from `status.md`: each follow-up becomes a small task folder
     ("Small tasks and follow-ups"), each owner question a `Q-` item in `docs/OWNER_QUEUE.md`.
   - **The follow-ups that name this task:** `git grep -l "task-NNN" master -- docs/tasks/active/` finds
     every task whose `With:` or `After:` names it. For each: still needed (update its `status.md`, and
     an `After:` on this task is now met), already done by this task (set it `DONE` with this merge), or
     moot (set it `DROPPED`, say why). Move the folders of the last two to `completed/`.
   - `git mv docs/tasks/active/task-NNN-<slug> docs/tasks/completed/`, then update every link to the old
     path: `git grep -l "tasks/active/task-NNN-"`, applied migrations excepted (`TASKS.md`).
4. **Clean up:**

   ```bash
   git worktree remove <worktree>
   git branch -d task/task-NNN-<slug>
   # then the project's branch database cleanup (Workflow settings → Branch database)
   ```

   The cleanup deletes the task's throwaway database stack once its worktree is gone. If Windows refuses to
   delete the folder because a session still has it open, say so; the owner closes that session.

Never push master. The owner decides when to push; a push may deploy (the project's `AGENTS.md` says where).

## Worktrees

- One task = one branch = one worktree (Workflow settings → Worktrees) on branch
  `task/task-NNN-<slug>`. Never implement on master or in the main checkout.
- This rule overrides tool defaults: the Claude desktop app's and `superpowers:using-git-worktrees`'
  `.claude/worktrees/` and `.worktrees/`, and Codex's own worktree location.
- One exception stays where it is: the project's merge command's own worktree (the project's `AGENTS.md`
  names it).

## Shared local services

Every agent on this machine uses the same local services, the same CPUs and the same dev test user. These
rules keep one agent's work from breaking or misleading another's. The project's own services, its test
users and its dev server notes are in its Local services doc (Workflow settings → Local services).

- **Never restart a shared local service** (the project's Local services doc names them and the commands that
  count as a restart) unless the owner says yes in this session. Each restart breaks every other agent's test
  run mid-way. If a service looks broken (refused connections, timeouts, errors every run shares), read the
  project's gate log (Workflow settings → Gate log) for other runs that failed the same way, then report it to
  the owner. Your own branch database (Workflow settings → Branch database) is yours to reset and stop.
- **Browser checks that change data use a user of your own**, never the shared dev test user (the owner's
  and every agent's); the project's Local services doc says how to make one and how it is removed. Delete it
  when the task is done. Reading pages as the shared test user is fine.
- **Run the dev server from the task's worktree.** A preview started from the folder your session opened in
  serves that folder's code (usually master), not your branch. Before calling a UI change verified, check
  the page shows your change.
  - **Claude desktop app:** its preview tool (`preview_start`) runs only configurations from
    `.claude/launch.json` in the session's folder (the main checkout), and moving the session's folder takes
    effect only after the turn. So add a temporary configuration that runs the worktree's server on a port
    of its own, start it, and **restore the file at once** (it is tracked and shared):

    ```json
    {"name": "task-NNN", "runtimeExecutable": "npm",
     "runtimeArgs": ["--prefix", "<the worktree's full path, forward slashes>", "run", "dev", "--", "-p", "31NN"],
     "port": 31NN}
    ```

    Check `git status --short .claude/launch.json` is clean before adding it, `preview_start` with
    `name: "task-NNN"`, then `git checkout -- .claude/launch.json` right away (the server keeps running).
    Stop it with `preview_stop` when done. Never commit the configuration.
  - **A terminal (Codex, or the CLI):** run the project's dev server on a port of its own (`-p 31NN`) in the
    worktree.
- **Expect a busy machine.** While iterating, run only the integration files your change touches, at the
  default single worker. Several agents' tests at once make everything slower; a test that times out
  under load is not a flaky test until the project's gate log says so. The project's gate waits for any other
  gate and gives up after a while: that is a queue, not a failure. A reviewer with several tasks in
  `REVIEW` merges them in one run of the project's merge command with every branch, which runs one gate for all.
