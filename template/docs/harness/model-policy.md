# Model policy: the ladder, effort, the ledger, the lessons

<!--
source: the owner's brief of 2026-10-26 (Sonnet for a substantial share; no effort floor; track outcomes; persistent lessons for the planner); v1 claude/CLAUDE.md agent table; owner rules of 2026-10-13 (reviews by Opus) kept
applies: every dispatch decision, by the manager or a Codex session; the weekly review
review-by: 2027-01-31
-->

The aim: a substantial share of tasks built by Sonnet (Codex: Luna), effort judged per task with no floor,
and a record that shows when a weaker model needed too many rounds, so plans get more explicit, and when a
stronger model was overkill, so the ladder moves down.

## The ladder (Claude)

| Task | Builder | Effort |
|---|---|---|
| Mechanical with an exact recipe and one obvious check: rename, config, copy, a small doc, a test fixture | Sonnet | low or medium |
| A plan task with named files, named tests, a settled design, under about three files | Sonnet | medium |
| The same, more files or a touch of judgement the plan already bounds | Sonnet | high |
| Ambiguity the spec leaves, or a design judgement a user would notice | Opus | high |
| The project's hard areas (`AGENTS.md` → Workflow settings), concurrency, a bug that resisted one attempt | Opus | xhigh |
| A third round after Sonnet failed two `FIX` rounds on one task | Opus | high (ledger: `escalated`) |
| The hardest problems, where xhigh is not enough | Opus | max (your judgement, said in the plan) |
| Anything | never Fable as a subagent (owner, standing); Fable plans and reviews reports in the manager tab |

**Reviews:** Opus for every code tier (`unit`, `integration`, `e2e`; owner, 2026-10-13); Sonnet allowed for
`docs` and `static` (manager, 2026-10-26). Review effort: medium for a diff under about 150 lines, high
above, and never below the builder's effort. A hard-area or concurrency review is Opus at xhigh.

**Explorer:** Haiku at low for a lookup; Sonnet at medium for an explanation or a spec question.

**Effort is passed on every dispatch** with the model (Claude: the Agent tool's `model` and `effort`;
Codex: the role's `model_reasoning_effort`, overridden per spawn). The Claude role files set neither; the
Codex role files set defaults (builder Luna medium, reviewer Sol medium, explorer Luna low) that every
spawn overrides with the row the ladder gives.

## The ladder (Codex)

| Claude row | Codex |
|---|---|
| Sonnet | `gpt-6-luna` (Luna), same effort |
| Opus | `gpt-6-sol` (Sol), same effort |
| Reviewer | Sol (Luna for `docs` and `static`) |
| Explorer | Luna, low |

`.codex/agents/{builder,reviewer,explorer}.toml` hold the roles; `codex.md` says how a Codex session
spawns them.

## What makes a task Sonnet-ready

A plan task a Sonnet builder finishes first pass names: the exact files; the function or type to add or
change, with its signature; the test file and the test names; the `Done when:` commands and expected
results; the decisions already made with their tags; the one rule from `AGENTS.md` that bites here. A task
that needs the builder to choose a design, infer a type from usage, or decide what a user sees is not
Sonnet-ready: either the plan says it, or the task goes to Opus. `lessons.md` records what was missing when
Sonnet failed, in the planner's own words.

## The ledger

`docs/harness/ledger.md` has one row per dispatch, written by the manager when the report arrives (a Codex
session writes its own rows):

```
| date | task | step | role | tool | model | effort | tier | round | outcome | layer | note |
```

- `step`: `build`, `review`, `fix` (a builder resumed with findings), `close` (the task closed after its merge).
- `round`: 1 for the first build and the first review; a `fix` row and its re-review carry the round number.
- `outcome`: on a `build` or `fix` row `built` (the builder reported finished work), `blocked` or
  `abandoned`; on a `review` row `approve`, `fix` (findings returned) or `escalated` (the next build goes
  to a stronger model); on a `close` row `done`. A `close` row carries the role, model, effort and tier of the review it closes.
- `layer` (on `fix`, `escalated` and `blocked`; else `none`), the harness layer that failed, from lecture 1 of
  the harness course: `spec` (the plan left a choice or a fact out), `context` (the agent lacked a doc or
  a decision it needed), `environment` (install, services, ports), `verification` (the checks did not catch
  it, or evidence was wrong), `state` (handoff or status drift), `capability` (the model could not do it
  with everything in place).
- `note`: a few words; the finding's `what` for a `fix`.

`<Harness CLI> ledger` (the CLI from the template repository) prints the week: Sonnet share, first-pass
approval per model, fix rounds per model and tier, escalations, failure layers, overkill candidates (Opus
builds approved first pass on `docs`, `static` or `unit`), and this machine's token usage per model from
the usage log. The weekly review (`maintenance.md`) reads it and moves the ladder.

## Lessons

`docs/harness/lessons.md` is the planner's persistent memory: dated, one paragraph each, written when a
`fix`, `escalated` or `blocked` row has layer `spec` or `context`, and at the weekly review. The manager reads it before
writing a plan. A lesson says what was missing and what the plan should contain next time ("Sonnet guessed
the error shape; paste the error type and the one call site"). Lessons that stop recurring are retired at
a review, with the date.
