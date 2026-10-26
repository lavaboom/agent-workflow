# Dispatch recipes

<!--
source: v1 dispatch recipes, rewritten for the v2 roles, tiers, the reviewer contract and the ledger
applies: every dispatch from the manager tab
review-by: 2027-01-31
-->

What a subagent's prompt contains, part by part. The prompt is the subagent's only context besides the
project's `AGENTS.md`, the `.claude/rules/` files and its role definition. Every dispatch passes
`subagent_type` (`builder`, `reviewer`, `explorer`), **`model` and `effort`** from the ladder
(`docs/harness/model-policy.md`). Builders and reviewers run in the background; an explorer answering the
owner runs in the foreground. Commands and lists come from the project's Workflow settings; paste their
values into the prompt, never "see the settings".

## Builder (one plan task, or one small task from its `status.md`)

1. **Where:** the worktree's full path and branch. "Work only there, by full path. Never in the main checkout
   (`<the Main checkout setting>`). Run the install step of 'Prepare a worktree' if the dependencies are
   missing." When the plan needs a branch database: "start it there (`<the Branch database command>`) if it
   is not running yet."
2. **What to read first:** the task folder's `status.md`, the spec and the plan, and the docs the "Docs a
   builder reads for a task" setting names; then the plan task itself, pasted verbatim (number, steps,
   files, signatures, tests), or the small task's `status.md` pasted.
3. **The tier and its checks:** the tier name and every command from `AGENTS.md`'s tier table, plus the
   integration or browser files this task names, with expected results. "Run exactly these; record each
   command and its result under `Evidence:`; run nothing the tier does not name."
4. **Decisions already made** that the task touches, each with its tag `(owner, date)` /
   `(manager, date)`, so the builder does not re-decide them.
5. **Rules by name:** the ones the "Rules every builder prompt names" setting lists, each with the one line
   that bites for this task, and "never restart a shared local service; a browser check that writes uses a
   test user of your own" (`docs/harness/places.md`).
6. **Commit:** on the branch, one or more commits, the task id and plan task number in each message,
   `status.md` updated in the same commit (`Commit`, `Evidence`, `Notes`, follow-ups under
   `For the roadmap:`). "Never merge, never push, never remove the worktree." When this is the task's last
   plan task (or a small task): "then set `Status: REVIEW`, `Owner: claude:manager`."
7. **It cannot ask:** "A decision the spec and the decisions above do not settle: stop, set
   `Status: BLOCKED` and `Blocked on: <what, with the options>` in `status.md`, commit, report. Do not guess
   on money, data kept, or anything a user sees."
8. **The report's shape:** files changed; commits (hashes); each check command and its result verbatim;
   anything deferred or not done and why; follow-ups noticed (one line each); whether the context got
   tight or compacted.

For a Sonnet builder, step 2's plan task must be Sonnet-ready (`model-policy.md`); if it is not, fix the
plan task before dispatching, not the model.

## Resume (a builder whose agent died)

The builder recipe, with step 2 followed by what the manager found in the worktree: the commits on the
branch since master (`git log --oneline master..HEAD`), the uncommitted files (`git status --short`), and
`status.md`'s last notes. Then: "Read the uncommitted changes first. Keep what the plan task asks for,
finish it, and commit; revert what it does not. Then continue the plan task from where `status.md` says
it stopped." A fresh agent: `SendMessage` cannot reach a dead one.

## Reviewer (one plan task on a branch)

1. **Where:** the worktree and branch; the diff to read: `git diff master...task/task-NNN-<slug>` limited
   to the plan task's commits (name them), plus `status.md`.
2. **The contract:** the spec sections and the plan task pasted verbatim with its `Done when:` lines; the
   tier and its commands with expected results; the decisions list; the docs the "Docs a builder reads"
   setting names.
3. **Checks, in order:** re-run every tier command yourself; does the work do what the task says and nothing
   more; does each `Done when:` hold; do the tests prove the behaviour; the code philosophy
   (`docs/harness/building.md`); the rules named in the builder's step 5; docs updated when the change is
   visible or changes a flow.
4. **The verdict's shape**, pasted from `docs/harness/verification.md`: `VERDICT`, `Checks run`,
   `Findings` as `severity · file:line · what · why · fix`, `Not checked`. "Each finding must be
   applicable by a Sonnet builder without re-deriving it. Zero findings is a valid review."

Who: Opus for `unit`, `integration`, `e2e`; Sonnet allowed for `docs` and `static`; effort medium under
about 150 changed lines, high above, never below the builder's; xhigh for a hard area or concurrency.

## Merge master before the whole-branch review (a builder step)

Before any whole-branch check (owner, 2026-10-22), resume the task's builder (or dispatch a fresh one with
the builder recipe, Sonnet at medium) with: "merge master into the branch, resolve conflicts and commit
there; when the merge changed the dependency lockfile, run the install step of 'Prepare a worktree' again;
re-run the tier's checks; update `Evidence:`; report." The reviewer cannot do this: it cannot edit, and a
conflict resolution is an edit.

## Whole-branch reviewer (before the merge)

After that builder step, the reviewer recipe over the whole `git diff master...task/task-NNN-<slug>`, with
the checks to re-run spelled out: the union of the tier commands of every plan task on the branch, the
integration files the feature touches, and for a UI change a browser pass of every changed page from the
worktree's own dev server (`places.md`: a port of its own, console read; the reviewer has the session's
browser tools). The gate itself runs only in the merge command. Opus; xhigh for a hard area (a migration
included) or concurrency. Its findings go through the same fix loop.

## Explorer (a question, for the owner or for a spec)

`subagent_type: explorer`; Haiku at low for a lookup, Sonnet at medium for an explanation. The question in
one sentence, what the answer is for, the folders that likely hold it, and the shape wanted back: a
conclusion of a few sentences with `file:line` references, not file contents.

## Resuming a live builder (a fix round)

`SendMessage` to its id with the reviewer's findings pasted verbatim and: "fix these on the branch, re-run
the tier's checks, commit, report the same shape as before. If you disagree with a finding, say so with
evidence instead of skipping it." A ruling travels the same way: "add to the spec under Decisions:
`<the ruling> (manager, <date>)`, set `Status: IN_PROGRESS`, and continue." One round; then a fresh
scoped re-review of the fixes only.

## The ledger row, after every report

Append to `docs/harness/ledger.md` → Rows, in the main checkout, committed with the board or the next docs
commit:

```
| 2026-10-26 | task-031 | build  | builder  | claude | sonnet | medium | unit | 1 | built   | none | parser + 14 tests |
| 2026-10-26 | task-031 | review | reviewer | claude | opus   | medium | unit | 1 | fix     | spec | error type not named in plan |
| 2026-10-26 | task-031 | fix    | builder  | claude | sonnet | medium | unit | 2 | built   | none | |
| 2026-10-26 | task-031 | review | reviewer | claude | opus   | medium | unit | 2 | approve | none | |
| 2026-10-27 | task-031 | close  | reviewer | claude | opus   | medium | unit | 2 | done    | none | merged a1b2c3d |
```
