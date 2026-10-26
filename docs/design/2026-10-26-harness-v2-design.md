# agent-workflow v2: a lean, verifiable, model-economical harness

Design, 2026-10-26. Written by the manager (Claude, Fable 5.1) from the owner's brief of the same day, the
v1 workflow in this repository, the handoff note, the fourteen walkinglabs harness-engineering lectures with
their library and templates, and a local read of ECC 2.2.3 (`affaan-m/ECC`). Decisions the owner made are
tagged `(owner, date)`; calls made here are tagged `(manager, 2026-10-26)` and are the owner's to veto.

## 1. Intent

One harness, kept in this repository and copied into every project, that makes a coding agent:

1. **verifiable**: nothing is done because it "looks good"; a separate reviewer checks explicit acceptance
   criteria and, when they fail, says exactly what is wrong and how to fix it (owner, 2026-10-26);
2. **oriented**: a fresh session answers "what is this, how do I run it, how do I verify it, what is next,
   what is broken" from the repository alone (owner, 2026-10-26; lecture 3's fresh-session test);
3. **scoped**: each agent gets the instructions and permissions its task needs, no more (owner, 2026-10-26;
   lecture 4);
4. **economical**: Sonnet builds most tasks, effort is judged per task with no floor, and a persistent ledger
   records which model and effort each task took and how many review rounds it needed, so plans get better
   for weaker models and overkill gets noticed (owner, 2026-10-26);
5. **lean and alive**: as few always-loaded instructions as possible, a weekly review that retires or
   emphasises rules as the project's phase changes, and a per-project choice of tools rather than everything
   everywhere (owner, 2026-10-26; lectures 4 and 12).

It serves Claude Code and Codex today, and other tools later, from one entry file.

## 2. Goals, non-goals, anti-goals

**Goals**
- A project adopts the harness with one command and a short checklist, and updates it with one command.
- Every task has a verification tier and executable acceptance checks before a builder starts.
- A builder never grades its own work; the reviewer re-runs the checks in a fresh context.
- The instruction files a session loads at start stay under about 100 lines for the entry file and under
  about 40 for each always-on rule.
- The model and effort of every dispatch is a decision, written down, with a default that favours Sonnet.
- ECC's agents, skills and hooks are available to a project selectively, by a config file the project owns.

**Non-goals**
- Replacing the task flow that works (task folders, claims, worktrees, the merge gate, the owner queue). It is
  reorganised into topic documents, not redesigned.
- Building the shared scripts package (release 3 of the handoff note: the gate, the merge train, capacity).
  This design adds a small `agent-workflow` CLI for adoption, sync, checks and the ledger; release 3 can
  extend it.
- Autonomous loops (`/goal`, `/loop`, routines). The documents name them; nothing runs unattended by default.

**Anti-goals** (what would make this a failure even if it works)
- A 600-line entry file again, or a plugin that lists 300 skills in every session.
- A harness the two existing projects cannot adopt without a day of manual edits.
- Reviews that pass because the reviewer trusted the builder's report.

## 3. What the sources say, and what we take from each

| Source | Taken into v2 |
|---|---|
| Lecture 2 (harness = instructions + tools + environment + state + feedback) | The five subsystems are the checklist of the weekly review; feedback (verification commands) is treated as the highest-return part. |
| Lecture 3 (repo as system of record; fresh-session test) | Copies in the project, not links out of it. The entry file answers the five questions by pointer. |
| Lecture 4 (one giant file fails; entry file as a router; per-rule metadata) | `AGENTS.md` ≤ 100 lines; topic docs on demand; every rule file carries `source`, `applies`, `review-by`; the weekly review audits them. |
| Lecture 5 and 12 (continuity; clean state) | Clock-in and clock-out routines; `status.md` carries evidence; a clean-state checklist before a session ends. |
| Lecture 6 (initialisation is its own phase) | `agent-workflow adopt` is the initialiser; it ends with a readiness check, and nothing else happens in that session. |
| Lecture 7 and 8 (WIP = 1; feature lists as primitives) | One task per builder, one builder per branch (already so). `status.md` keeps the triple behaviour / verification / state, and the reviewer, never the builder, moves a task to `DONE`. |
| Lecture 9 and 10 (premature victory; e2e; agent-oriented errors) | Verification tiers; the reviewer re-runs checks; findings are `what · why · fix`; architectural rules become checks over time ("review feedback promotion"). |
| Lecture 11 (observability; rubric) | The outcomes ledger and the review verdict format; a failure layer on every `FIX`. |
| Lecture 13 (loops) | Named as a later step; the maker/checker split is already the core. |
| walkinglabs templates (progress log, handoff, clean-state checklist, evaluator rubric, quality document) | Folded into `status.md`, `handoff-<topic>.md`, the clock-out skill, the reviewer contract and the weekly review's quality table. |
| ECC (skills-first, rules/skills/agents/hooks separation, selective install, `code-reviewer`'s confidence filter, `cost-tracking`, `harness-audit`, Codex plugin) | ECC is a library a project draws from through `ecc-install.json` and the `claude-project` target. The reviewer agent adopts the confidence-based filtering and "zero findings is a valid review". A usage-log hook borrows the idea of ECC's cost tracker. ECC's always-on `rules/common` are **not** adopted: their mandatory TDD and 80 % coverage contradict proportionate verification (owner, 2026-10-26). |
| v1 of this repository | The task flow, task folders, status format, groups, owner queue, shared-services rules, manager loop and dispatch recipes carry over, split by topic and trimmed. |

## 4. Decisions

### D1. Copies in the project, not links out of it (manager, 2026-10-26)

Claude Code treats an `@` import or a rules symlink whose target is outside the working directory as
*external*: it asks once per project and, until approved, loads nothing from it. That is the root cause of
the handoff's open problem A. v2 removes the mechanism: every file an agent needs lives in the project,
copied from this repository by `agent-workflow adopt` and refreshed by `agent-workflow sync`. A manifest in
the project (`docs/harness/manifest.json`) records the template version and a hash per managed file, so
`sync` can tell a local edit from an upstream change and never silently overwrite one. Cloud sessions and CI
see the same files. This repository remains the only place the shared text is edited; a change is a commit
and a tag here, and `sync` in each project.

### D2. One entry file, `AGENTS.md`, for every tool (manager, 2026-10-26)

Claude Code ≥ 2.1.277 reads `AGENTS.md` when the project has no `CLAUDE.md`; Codex reads it natively. So the
project has no `CLAUDE.md`. Claude-only always-on rules live in `.claude/rules/claude-code.md`, which loads
alongside `AGENTS.md`. (A project on an older Claude Code adds a one-line `CLAUDE.md` holding `@AGENTS.md`;
it never double-loads.) The entry file is a router of at most 100 lines: what the project is, how to start
and verify it, the hard constraints, the project's Workflow settings, and the index of topic documents.

### D3. Instructions split by audience and loaded on demand (manager, 2026-10-26)

| Layer | Where | Loads |
|---|---|---|
| Entry | `AGENTS.md` | every session |
| Always-on rules | `.claude/rules/core.md`, `.claude/rules/claude-code.md`, `.claude/rules/phase-*.md` | every Claude session (Codex: the same text sits in `AGENTS.md`'s hard constraints, kept short) |
| Path-scoped rules | `.claude/rules/tasks.md` (`docs/tasks/**`), `.claude/rules/hard-areas.md` (the project fills the paths) | when a matching file is read or edited |
| Topic documents | `docs/harness/*.md` | when a role's prompt names them or an agent follows a link |
| Role definitions | `.claude/agents/*.md`, `.codex/agents/*.toml` | when dispatched |
| Skills | `.claude/skills/*/SKILL.md`, mirrored in `.agents/skills/` for Codex | when invoked |

Every rule file and topic document carries a short header: `source` (why it exists), `applies` (when), and
`review-by` (a date or a phase, such as "launch"). The weekly review reads these.

### D4. Three roles with least privilege; model and effort chosen per dispatch (manager, 2026-10-26)

Claude Code lets a dispatch pass `model` and `effort` per call, so v2 keeps one definition per role rather
than v1's one per effort level:

| Role | Tools | Model and effort |
|---|---|---|
| `builder` | everything except `Agent` (a builder never spawns) | passed per dispatch; see the ladder below |
| `reviewer` | `Read, Grep, Glob, Bash` (runs checks; cannot edit) | passed per dispatch |
| `explorer` | `Read, Grep, Glob` | `haiku` or `sonnet`, low or medium |

The reviewer cannot edit, by tool restriction, so "small fixes the reviewer makes itself" (v1) is gone: every
fix is a finding with a `fix` line, and the builder applies it. That is what makes findings actionable for a
weaker builder and what keeps the maker and the checker apart. ECC specialists (`security-reviewer`,
`database-reviewer`, language reviewers, `build-error-resolver`, `e2e-runner`) are optional and installed
per project (D9); they are read-only except `build-error-resolver`.

Codex mirrors the roles in `.codex/agents/{builder,reviewer,explorer}.toml` with the same tool posture
(`sandbox_mode = "read-only"` for the reviewer and explorer).

### D5. The model ladder (manager, 2026-10-26; replaces v1's "never below high")

| Task | Builder | Effort |
|---|---|---|
| Mechanical, exact recipe, one obvious test (rename, config, copy, small docs) | Sonnet | low or medium |
| A plan task with named files, named tests and a settled design | Sonnet | medium (high when the task spans more than three files) |
| Ambiguity the spec leaves, or a design judgement a user would notice | Opus | high |
| The project's hard areas, concurrency, a bug that resisted one attempt | Opus | xhigh |
| A second attempt after Sonnet failed twice on the same task | Opus | high (the ledger records the escalation) |
| Anything | never Fable (owner, standing) |

Reviews: Opus for every code tier (owner, 2026-10-13, kept); Sonnet is allowed for the `docs` and `static`
tiers (manager, 2026-10-26). Review effort is medium for a diff under about 150 lines and high above, and
never below the builder's effort. The explorer is Haiku for a lookup and Sonnet for an explanation.

Codex: Luna (`gpt-6-luna`) is the default builder, Sol (`gpt-6-sol`) for the Opus rows, with the same effort
column; the reviewer is Sol. The ledger uses the same columns for both tools.

The target the owner set: a substantial share of tasks built by Sonnet. The weekly review reports the share
and the first-pass rate per model so the ladder can move.

### D6. Verification tiers and the reviewer contract (manager, 2026-10-26)

Every task gets a tier at planning time, written in its plan task or its `status.md`, with the commands that
prove it:

| Tier | Checks the builder runs and the reviewer re-runs | Typical change |
|---|---|---|
| `docs` | the docs link check (Workflow settings), spelling of commands by running them if quoted | documentation, task files |
| `static` | lint, typecheck | CSS, markup, copy, config |
| `unit` | `static` + the unit tests of the touched modules | a function, a component, a parser |
| `integration` | `unit` + the named integration files, on a branch database when there is a migration | data layer, API, migration |
| `e2e` | `integration` + the named browser flow from the task's own dev server | a user flow across layers |

The plan names the tier and the exact commands; "run the tests" is not an acceptance check. A `docs` or
`static` task never starts a database. A task that crosses a component boundary is `integration` or `e2e`
whatever its size (lecture 10).

The reviewer's verdict has a fixed shape: `APPROVE` or `FIX`; each finding `severity · file:line · what ·
why · fix`; the commands it ran with their results; one line on what it did not check. It reports only
findings it is over 80 % sure of, consolidates duplicates, and returns zero findings when the work is clean
(from ECC's `code-reviewer`). On `FIX` the manager resumes the builder with the findings verbatim; after
two `FIX` rounds a Sonnet builder is replaced by Opus; after three rounds in total the manager rules.

### D7. The outcomes ledger and the planner's lessons (manager, 2026-10-26)

`docs/harness/ledger.md` is a table with one row per dispatch: date, task, step (`build`, `review`, `fix`),
role, tool (`claude` or `codex`), model, effort, tier, round, outcome (`approve`, `fix`, `escalated`,
`blocked`, `abandoned`), failure layer (`spec`, `context`, `environment`, `verification`, `state`,
`capability`, `none`; lecture 1's attribution), and a short note. The manager writes the row when it reads
the report; a Codex session writes its own rows. `agent-workflow ledger` prints the week's numbers: Sonnet
share, first-pass approval rate per model, mean fix rounds per model and tier, escalations, and "overkill
candidates" (Opus builds approved first pass on `docs`, `static` or `unit` tiers).

`docs/harness/lessons.md` is the persistent memory for whoever writes plans: short, dated entries such as
"Sonnet guesses the error shape when the plan does not quote the type; paste the type". The weekly review
turns ledger patterns into lessons, and the manager reads the file before writing a plan.

A Stop hook (`.claude/hooks/usage-log.mjs`, lean, no dependencies) appends one row per session to
`~/.claude/metrics/usage.jsonl` with the project, the models used and their token counts, read from the
transcript Claude Code hands to Stop hooks. It is per machine, never committed, and `agent-workflow ledger`
summarises it next to the task ledger. ECC's `cost-tracking` skill and hook can replace it for a project
that adopts ECC hooks.

### D8. Session lifecycle: clock in, clock out, clean state (manager, 2026-10-26)

Clock in (the entry file's "Start here"): read the board, the roadmap's in-progress section, the open owner
questions, your task's `status.md`; run the project's readiness command; fix a failing baseline before
anything else. Clock out (the `clock-out` skill, also the builder's "Finishing a task"): `status.md` updated
with commit, evidence and the next step; no debug leftovers; the standard start path still works; a
`handoff-<topic>.md` when the task is unfinished. The board's `Next step:` and `Current issues:` lines are
mandatory and are what a fresh session reads first.

### D9. ECC as a library, selected per project (manager, 2026-10-26)

Nothing from ECC is installed at user level, because every enabled plugin puts all its skill and agent
descriptions into every session. ECC's own installer was measured during this design: `--skills
security-review` for the `claude-project` target writes 58 files (the skill's whole module), so it cannot
serve single picks. A project therefore **vendors single files** from a pinned ECC checkout with
`agent-workflow vendor` (provenance and hashes recorded in `docs/harness/manifest.json`), and keeps an
`ecc-install.json` only for a module wanted whole (the hooks runtime for cost tracking), applied with
`npx ecc-universal@2.2.3 install --config ecc-install.json`. The template ships a
selection guide (`docs/harness/tooling.md`) with the picks worth considering by need: `security-review` and
`security-reviewer` for auth and payments, `e2e-testing` and `e2e-runner` for a web UI, `database-reviewer`
for Postgres, the language reviewers by stack, `build-error-resolver` for red builds, `cost-tracking` when
the project adopts ECC hooks. ECC's `rules/common` pack is not recommended (see §3). The weekly review asks
which installed pieces were used.

### D10. The weekly harness review (manager, 2026-10-26)

A skill, `/harness-review`, run by the manager (or a Codex session) once a week: the ledger numbers; each
rule's and topic doc's `review-by`; the entry file's line count and the always-on rule count
(`agent-workflow check`); the installed ECC pieces and whether any dispatch used them; the template version
against this repository's latest tag; the phase (a phase change retires `phase-*.md` rules). It ends with a
dated entry in `docs/harness/review-log.md` listing what was removed, added or emphasised, and with the
ledger-derived lessons. Once a month it proposes one component to disable for a week (lecture 12's
ablation).

### D11. v1 stays reachable until both projects migrate (manager, 2026-10-26)

`main` before this design is tagged `v1.0.0`. The v1 files move to `v1/` unchanged; one-line stubs at the old
root paths point there, because HomeXpense's and GroWith's `AGENTS.md` name those paths; the two user-level
junctions are re-pointed to `v1/claude/...` so running manager tabs keep working. Correction after review
(2026-10-26): a personal skill beats a project skill of the same name, so the `~/.claude/skills/manager`
junction must go before the first project migrates (and the agents junction with it, for least privilege);
the project still on v1 gets project-level copies of the v1 agents and manager skill meanwhile
(`ADOPTING.md` §2). When both projects are on v2, `v1/`, the stubs and the last junction go.

### D12. The CLI is plain Node with no dependencies (manager, 2026-10-26)

`bin/agent-workflow.mjs` with `adopt`, `sync`, `check`, `ledger`. No build, no install: a project runs
`node C:/code/agent-workflow/bin/agent-workflow.mjs <command>` or the npm script `adopt` writes for it. The
release-3 brief chose TypeScript through `tsx`; this deviates to zero dependencies so adoption needs nothing
but Node. Release 3 can add `gate`, `merge` and the rest to the same CLI.

## 5. What a project contains after `adopt`

```
AGENTS.md                         entry file (project-owned after creation)
.claude/settings.json             hooks: usage-log on Stop; a small permission allowlist (project-owned)
.claude/rules/core.md             always-on non-negotiables                       (managed)
.claude/rules/claude-code.md      Claude-only: dispatch, model+effort per call     (managed)
.claude/rules/tasks.md            paths: docs/tasks/**                             (managed)
.claude/rules/hard-areas.md       paths: the project's hard areas                  (project-owned)
.claude/rules/phase-pre-launch.md expires at launch                                (project-owned)
.claude/agents/{builder,reviewer,explorer}.md                                      (managed)
.claude/skills/manager/           SKILL.md, dispatch-prompts.md                    (managed)
.claude/skills/harness-review/    weekly review                                    (managed)
.claude/skills/clock-out/         clean-state handoff                              (managed)
.claude/hooks/usage-log.mjs       Stop hook                                        (managed)
.agents/skills/                   Codex copies of the three skills                 (managed)
.codex/config.toml, .codex/agents/*.toml                                           (managed)
docs/harness/README.md            index: which role reads which document           (managed)
docs/harness/task-flow.md         states, picking up, claiming, planning, small tasks, groups
docs/harness/places.md            main checkout, worktrees, shared services
docs/harness/building.md          working on a task, finishing, stay in your lane
docs/harness/verification.md      tiers, acceptance checks, evidence, the reviewer contract, rounds
docs/harness/review-and-merge.md  review, merge, close, clean up
docs/harness/manager.md           orchestrated mode, the board, rulings
docs/harness/owner-queue.md
docs/harness/model-policy.md      the ladder, Codex equivalents, the ledger columns
docs/harness/session.md           clock in, clock out, clean state, handoffs
docs/harness/maintenance.md       weekly review, rule metadata, ablation, updating from the template
docs/harness/tooling.md           ECC selection guide, MCP and plugin hygiene
docs/harness/codex.md             Codex notes
docs/harness/ledger.md, lessons.md, review-log.md                                  (project-owned)
docs/harness/manifest.json        template version + managed-file hashes           (written by adopt/sync)
docs/ROADMAP.md, docs/OWNER_QUEUE.md, docs/manager/board.md, docs/tasks/README.md, docs/local-services.md
ecc-install.json                  optional                                          (project-owned)
```

## 6. Constraints

- Personal information is never committed to this public repository; project names and machine paths stay
  out of managed files (the template says `<project>`).
- Rules the owner decided keep their tags and dates when moved.
- Windows first: paths in scripts are handled with Node's `path`; no shell-specific syntax in the CLI.
- Claude Code ≥ 2.1.277 (AGENTS.md native read, per-call effort); Codex CLI ≥ 0.146 (`.agents/skills`,
  `.codex/agents`).

## 7. Left to the builder of the CLI

The exact manifest JSON shape, hash algorithm (sha256 of file bytes), the `sync` conflict report format, the
ledger table parser's tolerance, and the test layout. The behaviour is specified in `docs/design/cli-spec.md`.

## 8. Open questions for the owner

1. Reviews on the `docs` and `static` tiers by Sonnet (D5): keep or revert to Opus for everything?
2. The usage-log hook reads session transcripts on this machine to count tokens per model. Fine?
3. Once HomeXpense and GroWith are on v2: delete `v1/` and the junctions in the same week, or keep a
   release's grace?
