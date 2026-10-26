# agent-workflow

A lean, verifiable, model-economical harness for coding agents, kept here once and copied into every
project. One entry file (`AGENTS.md`) for Claude Code, Codex and whatever comes next; three agent roles
with least privilege; verification tiers so nothing is done because it "looks good"; a model ladder that
builds most tasks with Sonnet and records what every dispatch cost; and a weekly review that keeps the
instructions small as the project changes phase.

Version 2 (2026-10-26). Version 1 is frozen under `v1/` and tagged `v1.0.0` until the projects on it
migrate. The design and its sources: `docs/design/2026-10-26-harness-v2-design.md`.

## What is here

| Path | What |
|---|---|
| `template/` | The pack a project receives: `AGENTS.md`, `.claude/` (rules, agents, skills, a hook, settings), `.codex/`, `docs/harness/` (the topic documents), the project-owned starters (roadmap, owner queue, board, ledger, lessons). `template.json` lists every file and whether it is `managed` (kept identical by `sync`) or `owned` (created once, then the project's). |
| `bin/agent-workflow.mjs` | The CLI: `adopt` (install the pack), `sync` (update managed files), `check` (lean and freshness checks), `ledger` (the week's numbers), `vendor` (copy single ECC pieces with provenance). Plain Node, no dependencies. |
| `docs/design/` | The v2 design, with every decision tagged, and the CLI specification. |
| `ADOPTING.md` | How a new or existing project adopts v2, for Claude Code and Codex, and how to migrate from v1. |
| `v1/` | The previous workflow, unchanged, reachable through the root stubs and the user-level junctions until the last project leaves it. |

## The harness in one paragraph

A task is written down with a verification tier and executable `Done when:` lines. Whoever picks it up
claims it on master and works in its own worktree. A builder (Sonnet by default, Opus where the ladder says,
with `model` and `effort` passed on every dispatch) builds it, runs the tier's checks, records the evidence,
and sets `REVIEW`. A separate read-only reviewer re-runs the checks and returns `APPROVE` or `FIX` with
findings as `severity · file:line · what · why · fix`; after two fix rounds a Sonnet builder is replaced by
Opus. Every dispatch gets a ledger row; patterns become lessons the planner reads before the next plan. The
merge goes through the project's gate; the close moves the folder and copies the notes to the roadmap. Once
a week the harness itself is reviewed: numbers, rules, phase, tooling, template version.

## Using it

```bash
# a project adopts the pack (run from the project root)
node C:/code/agent-workflow/bin/agent-workflow.mjs adopt --name <project>

# later: update managed files to this repository's current version
node C:/code/agent-workflow/bin/agent-workflow.mjs sync --dry-run
node C:/code/agent-workflow/bin/agent-workflow.mjs sync

# the weekly review's helpers
node C:/code/agent-workflow/bin/agent-workflow.mjs check
node C:/code/agent-workflow/bin/agent-workflow.mjs ledger --usage
```

`ADOPTING.md` has the full checklist, including what to delete from a project that was on v1.

## Changing the harness

A change to a managed file is an edit here, a commit, and a tag (`vMAJOR.MINOR.PATCH`); every project picks
it up with `sync`. Keep the entry file under 100 lines and every rule under its `review-by` date: `npm test`
runs the CLI's tests and `npm run check:template` checks the pack. The repository is public and holds no
personal information or project names by design.

## Sources

The walkinglabs harness-engineering course (`https://walkinglabs.github.io/learn-harness-engineering/`), its
templates, and ECC 2.2.3 (`https://github.com/affaan-m/ECC`), used as a library of agents, skills and hooks a
project picks from (`template/docs/harness/tooling.md`). The mapping from each source to what was taken is
§3 of the design document.
