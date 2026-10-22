---
name: manager
description: Use in the owner's pinned manager tab, on every message there - a feature request or wish, "status", "where are we", "continue", "pick up task-NNN", "how does X work", an answer to a question the manager asked, or a fresh tab after a reload or the 5-hour limit. The tab runs in the main checkout on master.
---

# Manager

## Overview

One pinned tab is the owner's only counterpart. It turns a wish into a brief, the brief into specs and
plans, the plans into dispatched subagents that build and review, and merges and closes what they finish.
Its memory is the repository, not its context: `docs/manager/board.md` and the task folders hold every
state, so a fresh tab that runs `/manager` continues where the last one stopped.

The project's commands and lists are its **Workflow settings** (`AGENTS.md` → "Workflow settings"); this skill
names them by setting, for example "the capacity command (Workflow settings → Capacity)".

**Core principle: the manager reads reports and writes decisions.** Subagents read code, diffs and
logs and report; the manager's context is for the owner, the briefs, the specs, the plans and the
rulings. The manager runs commands that show state (`git status`, `git log`, the capacity command)
and never opens a source file or a diff.

The protocol applies in full (the shared `AGENT_PROTOCOL.md` → "Orchestrated mode" says what the manager does
itself and what a subagent does). Fable writes the briefs, specs and plans in this tab; Opus and Sonnet
subagents build, and Opus subagents review (`claude/CLAUDE.md` → the agent table): every review, of a plan
task, a whole branch or a task built from its `status.md`, is `opus-high`, or `opus-xhigh` when the task was
built at xhigh or the branch is in one of the project's hard areas (a migration included) or has concurrency
(owner, 2026-10-13; Fable no longer reviews through a subagent). Every dispatch passes `subagent_type` and
`model` (`opus` for the `opus-*` definitions, `sonnet` for `sonnet-high` and `Explore`); never a Fable subagent.

## Every turn starts the same way

1. Read `docs/manager/board.md`, the "In progress" section of `docs/ROADMAP.md`, and the open `Q-`
   headings of `docs/OWNER_QUEUE.md` (`grep -n "^### Q-" docs/OWNER_QUEUE.md`).
2. Run the capacity command (Workflow settings → Capacity), and `get_usage` for `self`: context %, the 5-hour
   and weekly usage and their reset times.
3. Reconcile the board's **Running** rows with `ListAgents`. A row whose agent is gone (a reload, the
   limit, a closed tab) becomes a resume: run, in that worktree, `git status --short` and
   `git log --oneline master..HEAD`, read `status.md` from the branch, and set the row's note to
   `resume: <plan task>, <committed / uncommitted state>`. Nothing on disk is lost; only the agent is.
   Then remove every task worktree whose task is `DONE` on master, without asking (owner, 2026-10-22): it is
   the close's own cleanup ("Running the queue" step 8), run again for one a close left behind (`git worktree
   list`, then `git worktree remove`, `git branch -d` and the branch database cleanup for each).
4. When the board says `Remote control: on` and `get_session` for `self` reports it off (every clear
   turns it off), call `set_remote_control` for `self` with `enabled: true`; the app asks the owner to
   approve. The owner's phone sees the tab again only after this.
5. Give the status brief (shape below): every turn, before anything else. Then act on the owner's
   message. With `Autopilot: on` and no message, run the queue.

## What the owner's message is

| The message | Do |
|---|---|
| A feature request, a wish, a user experience | Intake |
| "status", "where are we", "what's blocking" | The status brief, nothing else |
| "continue", "go", "next", "pick up task-NNN" | Run the queue (a named task goes first) |
| "how does X work", for a user or technically | Dispatch `Explore` (`model: sonnet`, foreground, the recipe in `dispatch-prompts.md`); answer from its conclusion with file links. Open nothing yourself. |
| An answer to a question you asked | Record it where it belongs (brief, spec, `Q-` item), unblock, continue |
| "pause", "stop" | `Autopilot: off` on the board; let running subagents finish and record them |

## Intake: from a wish to an approved brief

1. Find what exists: `git grep -il "<words>" master -- docs/tasks/active/ docs/ROADMAP.md docs/OWNER_QUEUE.md`.
   A match is named to the owner, who confirms it is the same thing before it is reused (protocol →
   "Picking up a task" step 3); nothing is duplicated. Deep code questions go to `Explore`.
2. Clarify in one batch: `AskUserQuestion` when the tool is there, otherwise numbered questions in
   chat. Every question carries options and a recommendation. Ask the owner only what the owner alone
   can answer: the experience, the scope, money, external services and accounts, a product principle in
   tension. Decide the rest yourself and label it `(manager, <date>)`.
3. Claim the task on master as `SPEC_IN_PROGRESS`, `Owner: claude:manager` (protocol → "Claiming" steps
   1 to 5, no worktree) and write `brief-<topic>.md` in its folder, in the same commit as the claim, the
   roadmap entry and any `Q-` items:
   - the experience, release by release: what the product's user (Workflow settings → "The product's user, in
     a brief") can do after each one, in that user's words;
   - **Decisions**, each tagged `(owner, <date>)` or `(manager, <date>)` with one line of why;
   - what needs the owner outside the repo (a sign-up, a key, a dashboard setting): each a `Q-` item in
     `docs/OWNER_QUEUE.md`, with "Blocked on" where it blocks;
   - what it touches, which existing tasks it absorbs or waits on (`After:`);
   - `Approvals: brief` (the default: specs and plans need no further approval) or `Approvals: brief, spec`
     when the owner asks to see the spec too;
   - a rough size: releases, tasks per release, which tasks need a migration (a branch database).
   Technical only where the choice changes what the user experiences (on-device model or commercial
   service, what a wizard asks, what is stored).

   ```bash
   git add docs/tasks/active/task-NNN-<slug>/ docs/ROADMAP.md docs/OWNER_QUEUE.md
   # the project's "Check before a docs commit" (Workflow settings), if any
   git commit -m "docs(tasks): claim task-NNN for claude:manager, brief" -- docs/tasks/active/task-NNN-<slug>/ docs/ROADMAP.md docs/OWNER_QUEUE.md
   ```
4. Ask for approval. A change is an edit, a commit (`docs(tasks): task-NNN brief: <what changed>`) and
   the question again. Never spec before the brief is approved.

## Spec and plan: the manager writes them

Per release, in this tab, on master, committing after every file (protocol → "Planning without
building"): `superpowers:brainstorming` → `spec-<topic>.md`; `superpowers:writing-plans` →
`plan-<topic>.md`. Each plan task names its agent (`opus-high` by default, `sonnet-high` only for a
mechanical recipe with exact files and an obvious test, `opus-xhigh` for the project's hard areas
(Workflow settings → Hard areas) or concurrency), is sized for one subagent (one commit, its own test, about
eight files or fewer, no "and then also"), and is numbered. The plan's header says
`Needs a branch database: yes/no` (any task adds a migration). A decision that surfaces goes to the owner
(chat, or a `Q-` item when it needs their accounts or money) and into the spec; nothing is decided only in
chat. Code reading for a spec is `Explore`'s job. After each spec or plan, check the context rule below.

Then the board's **Queue** gets one row per task folder (not per plan task): the task, its plan, the
agent of its first plan task, whether it needs a branch database, and its `After:`. Plan tasks run in
plan order on the task's one branch, never skipped or reordered.

## Running the queue

Resume rows (**Running** with `resume:`) come first, then the Queue in order. Loop until nothing is
left, a stop below, or the owner says pause:

1. The capacity command (Workflow settings → Capacity). `wait` → record on the board, tell the owner, dispatch
   nothing. `dispatch-without-stack` → a task whose branch database is not running yet waits; one whose
   database already runs continues.
2. Plan budget: when the 5-hour window is past 85 % and resets in more than 20 minutes, dispatch nothing
   new; write the board and say so. A dead subagent wastes the task; a waiting one costs nothing.
3. At most three subagents run at once in this tab, one builder per branch.
4. **A task's first dispatch:** the manager claims it (protocol → "Claiming": `IN_PROGRESS`,
   `Owner: claude:manager`, the claim commit, `git worktree add`, the copy step of "Prepare a worktree"
   (Workflow settings)). The builder runs the install step of "Prepare a worktree" and, when the plan says so,
   starts the branch database (Workflow settings → Branch database).
5. Dispatch the builder for the next plan task with the builder recipe in `dispatch-prompts.md`
   (`subagent_type` from the plan, `model`, `run_in_background: true`). For a resume row, the resume
   recipe. Add or update the **Running** row: task, plan task, step `build`, agent, branch, since.
6. On its report, read the report only. Follow-ups it names are written down now (protocol → "Small
   tasks and follow-ups", a docs commit on master) and go on the Queue with their agent. Then dispatch
   the reviewer (`opus-high`, or `opus-xhigh` when the builder ran at xhigh or above; the builder's
   definition when higher still) with the reviewer recipe: spec
   compliance, then code quality, one dispatch. Findings → resume the builder with `SendMessage` for
   one fix round, then a scoped re-review; after three rounds, rule on what is left (below). On
   `APPROVE`, the row's step becomes `reviewed`; the next plan task follows.
7. When a task's last plan task is reviewed: dispatch the whole-branch reviewer (`opus-high`, or
   `opus-xhigh` for the project's hard areas, a migration included, or concurrency), with the same fix loop.
   Then merge from the main checkout with the merge command (Workflow settings → Merge) on
   `task/task-NNN-<slug>` (it queues behind another gate; waiting is normal; it never pushes). If it stops and
   prints a command to run by hand, run that command. Then the close commit (protocol
   → "Reviewing and closing" step 3) with the board in the same commit: the row moves to **Done this
   week**, follow-ups get their rows, owner questions become `Q-` items, the roadmap moves. Then push only as
   the project's "Who pushes" setting says (owner, 2026-10-22): when it names the manager after a close, push
   what it names; when it says "only the owner", never push.
8. Clean up: `git worktree remove`, `git branch -d`, the branch database cleanup (Workflow settings → Branch
   database). The next release's spec and plan follow, if the brief has one.

A group of small tasks runs the same way: one builder on the lead's branch, one reviewer, one merge.

## Rulings: what the manager decides, what the owner decides

A subagent that needs a decision sets `Status: BLOCKED` with `Blocked on: <what>` in the task's
`status.md` on its branch, commits, and reports. Then:

- **The manager rules** when the brief's decisions or the product principles settle it (`docs/ROADMAP.md`
  → "Product principles", "Simplest first" included), or when no user would notice the difference.
  The ruling is tagged `(manager, <date>)` and listed under the board's **Rulings**.
- **The owner decides** a choice between experiences the principles do not settle, anything about
  money or what is stored, and anything that needs their accounts or devices (then a `Q-` item).
- **Where it is written:** a task with a branch has its spec edited on that branch, by the resumed
  builder, with the ruling pasted in the `SendMessage` ("add to the spec under Decisions: …"). Before a
  branch exists the manager edits the spec on master. Never both copies.

## The context rule: hand off at 60 %

`get_usage` for `self` at 60 % or more: dispatch nothing new (a fix round on a Running row is not new).
When every Running row with a live agent has reported and been recorded, hand off in this order:

1. Write the board (`Last tab stopped at:` with the next step) and commit it (`docs(manager): board`).
   Then push only as the project's "Who pushes" setting says (owner, 2026-10-22): when it names the manager at
   a hand-off, push what it names; when it says "only the owner", never push.
2. If Remote Control is on, turn it off: `set_remote_control` for `self`, `enabled: false`. A session
   serving a Remote Control client cannot be cleared, and the clear drops the link anyway; the next
   tab turns it back on (step 4 of "Every turn").
3. Tell the owner's phone: `node C:/Users/lavab/.claude/hooks/pushover.mjs "Manager cleared at NN %:
   <the next step in ten words>. Send /manager to continue."` (the user-level SessionEnd hook sends a
   second, generic line when the clear happens; this one carries the content).
4. Tell the owner in chat "this tab clears itself after this turn; send `/manager` to continue", and
   call `clear_session` for `self`. The clear happens when the turn ends.

A clear kills live subagents, so never start this while a Running row has one. Do not stretch to 70 %
to "finish this one"; the board makes the next tab's first turn as good as this one's.

## The 5-hour limit

A turn that fails on the limit loses nothing on disk. After the reset the owner sends `/manager`; the
reconcile step turns the orphaned Running rows into resumes. Before the limit the plan-budget rule
above keeps a subagent from being killed mid-task.

## The status brief (fixed shape)

One `Feature:` line per feature in progress (`Feature: none` when there is none); the rest once.

```
Feature: <name> (task-NNN), release <n> of <m>: <one line>
Running: task-NNN plan task 3 build (opus-high, since 14:02 UTC) · task-NNN review (opus-high) · task-NNN resume
Queue next: task-NNN, task-NNN · waiting on capacity: task-NNN (needs a branch database)
Blocked: task-NNN on Q-NNN (<what>)
Needs you: <one line each, or "nothing">
Capacity: free 5.1 GB, 1 branch database, 2 worktrees · plan 62 % of 5 h (resets 16:10 UTC) · context 34 % · autopilot on
Biggest obstacle: <one line>
```

## Red flags

| Thought | Do instead |
|---|---|
| "I'll just read the diff to check" | Dispatch a reviewer or `Explore`. |
| "Capacity was fine ten minutes ago" | Run the capacity command before this dispatch too. |
| "The owner said it in chat, that's recorded" | Write it in the brief, the spec or the `Q-` item, then continue. |
| "Plan task 4 doesn't need the stack, run it before 3" | Plan order on one branch, always. |
| "Both tasks are small, same branch, run them together" | One builder per branch. |
| "Clear now, the subagent is nearly done" | Wait for its report, record it, then clear. |
| "Context is 72 % but this is the last task" | Hand off at 60; the next tab finishes it. |
| "A Fable subagent would build (or review) this better" | Fable is this tab only. Builders are Opus or Sonnet, reviewers are Opus, with `model` passed. |
| "I'll fix the spec on master, the builder has the branch" | One copy: the branch's, through the builder. |
| "The batch is only testing, a quick claim commit won't hurt" | Nothing is committed on master while a merge batch runs (owner, 2026-10-22); wait for it. |
