# Dispatch recipes

What a subagent's prompt contains, part by part. The prompt is the subagent's only context: it has
`WORKFLOW.md`, `claude/CLAUDE.md` and the project's `AGENTS.md` loaded and nothing else of this tab. Every
dispatch passes `subagent_type` (one of `~/.claude/agents/`, the shared repo's `claude/agents/`, or `Explore`)
and `model` (`opus` for `opus-*`, `sonnet` for `sonnet-high` and `Explore`). Builders and reviewers run in the
background; `Explore` for the owner's question runs in the foreground. Commands and lists come from the
project's Workflow settings (`AGENTS.md` → "Workflow settings"); paste their values into the prompt.

## Builder (one plan task, or one small task from its `status.md`)

1. **Where:** the worktree's full path and branch. "Work only there, by full path. Never in the main checkout
   (`<the Main checkout setting>`). Run the install step of 'Prepare a worktree' if it has not run (the
   dependencies are missing)." When the plan needs a branch database: "start it there (the Branch database
   setting) if it is not running yet".
2. **What to read first:** the task folder's `status.md`, the spec, and the plan; then the plan task
   itself, pasted verbatim (its number, steps, files and tests), or the small task's `status.md` pasted.
3. **Decisions already made** that the task touches, each with its tag `(owner, date)` /
   `(manager, date)`, so the builder does not re-decide them.
4. **Rules it must follow by name:** `WORKFLOW.md` and `AGENTS.md` are loaded; the ones that bite are the
   rules the project's settings list (Workflow settings → "Rules every builder prompt names"), each with the one
   line that bites for this task, and the protocol's "Shared local services" (never restart a shared local
   service; a browser check that writes uses a test user of its own).
5. **Tests to run** before reporting: the project's builder checks (Workflow settings → Builder checks), with
   the integration files the task names (on the branch's own database when the task adds a migration).
6. **Commit** on the branch, one or more commits, the task id and the plan task number in each
   message, and `status.md` updated in the same commit (commit, tests, notes; follow-ups under "For
   the roadmap"). "Never merge, never push, never remove the worktree." When the prompt says this is
   the task's last plan task (or a small task): "then set `status.md` to `Status: REVIEW`,
   `Owner: claude:manager`".
7. **It cannot ask.** "If a decision is needed that the spec and the decisions above do not settle,
   stop: set `Status: BLOCKED` and `Blocked on: <what, with the options>` in `status.md`, commit, and
   report. Do not guess on money, data kept, or anything a user sees."
8. **The report's shape:** files changed; commits (hashes); each test command and its result; anything
   deferred or not done and why; follow-ups noticed (one line each); whether the context got tight or
   compacted (so the manager can split the next task).

## Resume (a builder whose agent died)

The builder recipe, with step 2 followed by what the manager found in the worktree: the commits on
the branch since master (`git log --oneline master..HEAD`), the uncommitted files (`git status
--short`), and `status.md`'s last notes. Then: "Read the uncommitted changes first. Keep what the plan
task asks for, finish it, and commit; revert what it does not. Then continue the plan task from where
`status.md` says it stopped." A fresh agent: `SendMessage` cannot reach a dead one.

## Reviewer (one task on a branch)

1. **Where:** the worktree and branch; the diff to read: `git diff master...task/task-NNN-<slug>`
   limited to the plan task's commits (name them), plus `status.md`.
2. **Against what:** the spec sections and the plan task pasted verbatim; the decisions list.
3. **Checks, in order:** spec compliance (does it do what the task says, nothing more); the tests exist
   and prove the behaviour (run them); the code philosophy (`WORKFLOW.md` → testable, documentable,
   readable); the rules in builder step 4; docs updated when the change is visible to users or changes
   a flow (`docs/`, the feature's own doc, the project's user docs).
4. **Small fixes:** "Make them on the branch yourself, with tests, and say so."
5. **The verdict's shape:** `APPROVE` or `FIX`; findings as `severity · file:line · what · why`; the
   fixes it made; one line on test results. No restating of the diff.

Who: `opus-high` (`model: opus`), or `opus-xhigh` when the builder ran at xhigh or above, or the builder's
definition when that is higher (owner, 2026-10-13: every review is by Opus, a planned task's too; Fable
writes the specs and plans in the manager tab and never runs as a subagent).

## Whole-branch reviewer (before the merge)

First, before any gate or check (owner, 2026-10-22): merge master into the branch (resolve and commit there),
and when the merge changed the dependency lockfile, run the install step of "Prepare a worktree" again, so a
stale install does not fail the gate. Then, as the reviewer, over the whole
`git diff master...task/task-NNN-<slug>`, plus: run the project's builder
checks (Workflow settings → Builder checks), the integration files the feature touches, and a browser pass of
every changed page from the worktree's dev server (protocol → "Shared local services": a port of its
own, the console read). The same choice of reviewer as above (`opus-high`, or `opus-xhigh` when the branch
is in one of the project's hard areas, a migration included, or has concurrency).
Its findings go through the same fix loop as a task review.

## Explore (a question, for the owner or for a spec)

`subagent_type: Explore`, `model: sonnet`, read-only. The question in one sentence, what the answer
is for (a user explanation, a spec, a ruling), the folders that likely hold it, and the shape wanted
back: a conclusion of a few sentences with `file:line` references, not file contents.

## Resuming a live subagent (a fix round)

`SendMessage` to its id with: the reviewer's findings pasted verbatim, "fix these on the branch, run
the tests, commit, report the same shape as before". A ruling travels the same way: "add to the spec
under Decisions: `<the ruling> (manager, <date>)`, set `Status: IN_PROGRESS`, and continue". One
round; then a fresh scoped re-review.
