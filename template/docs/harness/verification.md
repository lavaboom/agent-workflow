# Verification: tiers, acceptance checks, the reviewer contract

<!--
source: the owner's brief of 2026-10-26 (explicit testing and feedback; proportionate testing); lectures 9 and 10 (premature completion, e2e, agent-oriented errors); ECC code-reviewer (confidence filtering)
applies: writing a plan task, building, reviewing
review-by: 2027-01-31
-->

A task is done when a separate reviewer has re-run its acceptance checks and said `APPROVE`. Nothing is
done because the builder says so, because the code looks right, or because a suite that was not run would
probably pass. The checks are decided before the build, sized to the change, and written where the builder
and the reviewer both read them.

## Tiers

The planner (the manager, or whoever writes the task) assigns one tier per task and writes it as `Tier:` in
`status.md` or in the plan task. The project's `AGENTS.md` lists the commands each tier runs here.

| Tier | Runs | Typical change | Never |
|---|---|---|---|
| `docs` | the docs link or format check; any command the doc quotes, once, to prove it is right | documentation, task files, README | a test suite, a database |
| `static` | lint, typecheck | CSS, markup, copy, config, a rename | a test suite, a database |
| `unit` | `static` + the unit tests of the touched modules, named by file | a function, a component, a parser | the whole suite, a database |
| `integration` | `unit` + the named integration files; on a branch database when the task has a migration | data layer, API route, migration, auth | the whole suite unless the project's gate is the only integration runner |
| `e2e` | `integration` + the named browser flow, as a command runnable from Bash (a Playwright or similar script) against the task's own dev server, console clean | a user flow across layers, a form that writes | an unscripted "click through it": a project without scripted browser tests tags the task `integration` and the builder pastes its manual browser look (steps, console) under `Evidence:` as a claim the reviewer reports as not checked |

Rules of thumb:

- A change that crosses a component boundary (UI to data, service to database, process to process) is at
  least `integration`, whatever its size: unit tests are blind to boundary defects.
- A UI change that a user can see is `e2e` when it writes data and `static` or `unit` when it does not,
  plus a browser look from the worktree's dev server, which is cheap and catches the obvious.
- The whole gate (Workflow settings → Gate) runs once, at the merge, by the merge command. Builders and
  reviewers run the tier, not the gate. The whole-branch review re-runs the union of the tier commands of
  every plan task on the branch plus the integration files the feature touches, and a browser pass for a UI
  change.
- When in doubt between two tiers, take the higher one and say why in the plan task.

## Acceptance checks (`Done when:`)

Every task and every plan task carries `Done when:` lines that are executable or observable:

```
Done when:
- npx vitest run src/lib/import/parse.test.ts → 14 passed
- npm run typecheck → exit 0
- GET /api/items?page=2 returns 20 rows and a next cursor (curl in the plan task)
- the Import page shows the row count after upload, console clean (browser, port 3017)
```

"Tests pass", "works", "looks good" are not acceptance checks. The planner writes them by naming the
command, the file, the input and the expected result; a weaker builder follows them without guessing, and the
reviewer can re-run them without reading the builder's mind.

## Evidence

The builder records every command it ran with its result under `Evidence:` in `status.md` and in its report.
The reviewer re-runs them; an `Evidence:` line that does not hold is a `FIX` with the failure layer
`verification` in the ledger, and the lesson goes to `lessons.md`.

## The reviewer contract

The reviewer (`.claude/agents/reviewer.md`; Codex: `.codex/agents/reviewer.toml`) cannot edit. It reads the
contract (spec sections, plan task, `Done when:`, tier, decisions), reads the diff in context, re-runs the
checks, and returns:

```
VERDICT: APPROVE | FIX
Checks run: <command> → <result>
Findings:
  <severity> · <file:line> · what: <defect> · why: <consequence> · fix: <exact change or test to add>
Not checked: <what it could not or did not verify, and why>
```

- `FIX` when any finding is critical or high, or when a `Done when:` line does not hold. Otherwise `APPROVE`,
  with medium and low findings for the builder's judgement at its next commit.
- Each finding is written for the builder that will apply it: the file and line, the input and state that
  trigger it, why the existing guards don't catch it, and the fix. A finding a Sonnet builder cannot act on
  without re-deriving the problem is not finished.
- Report only findings the reviewer is over 80 % sure of; consolidate repeats; skip taste; zero findings is a
  valid review.
- Severity: `critical` (security, data loss, a `Done when:` line false), `high` (a bug on the task's path),
  `medium` (maintainability, a missing test for a stated behaviour), `low` (style a project rule states).

## Fix rounds and escalation

1. On `FIX`, the manager resumes the builder with the findings pasted verbatim: "fix these on the branch,
   re-run the checks, commit, report the same shape". One round, then a scoped re-review of the fixes.
2. After two `FIX` rounds on a Sonnet-built task, the next round is built by Opus at high
   (`model-policy.md`); the ledger row says `escalated`.
3. After three rounds in total, the manager rules: split the task, change the spec, or accept the medium
   findings as follow-up tasks. The rounds and the layer go in the ledger; the pattern goes in `lessons.md`.
4. A builder that disagrees with a finding says so in its report with evidence; it does not silently skip it.

## Promoting review feedback

A finding that recurs across tasks becomes a check: a lint rule, a test, a `.claude/rules/` path-scoped
rule, or a line in the tier table. The weekly review (`maintenance.md`) reads the ledger's `layer` column
and the findings quoted in `lessons.md` for candidates. An error message a check prints should say what is
wrong, why it matters and how to fix it, so the next agent self-corrects.
