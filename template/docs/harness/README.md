# The harness: topic documents

<!--
source: agent-workflow v2; the index of docs/harness/
applies: anyone deciding what to read
review-by: 2027-01-31
-->

The shared way of working for every agent in this project, split by topic so a role reads what its task
needs and nothing more. `AGENTS.md` is the entry file; `.claude/rules/` holds the always-on and path-scoped
rules; this folder holds the rest. The upstream is the `agent-workflow` repository (`manifest.json` says
which version); edit managed files there, not here (`maintenance.md`).

| Document | What it holds | Who reads it |
|---|---|---|
| `task-flow.md` | task states, picking up and claiming, planning without building, small tasks, groups | everyone who claims or creates a task |
| `places.md` | main checkout, worktrees, the shared machine and its services, the dev server per task | every builder and reviewer |
| `building.md` | working on a task, the code philosophy, stay in your lane, finishing (`REVIEW`) | every builder |
| `verification.md` | tiers, acceptance checks, evidence, the reviewer contract, fix rounds and escalation | planners, builders, reviewers |
| `review-and-merge.md` | reviewing, merging through the gate, closing, cleaning up | reviewers, the manager |
| `manager.md` | orchestrated mode: the manager tab, the board, intake, rulings | the manager tab |
| `owner-queue.md` | `Q-` items: what needs the owner and how it is asked | everyone |
| `model-policy.md` | the model ladder (Claude and Codex), effort, the outcomes ledger and lessons | planners, the manager, Codex sessions |
| `session.md` | clock in, clock out, clean state, handoffs | everyone |
| `maintenance.md` | the weekly harness review, rule metadata, retiring rules, updating from the template, ablation | the manager, the weekly review |
| `tooling.md` | choosing ECC pieces, MCP servers and plugins per project; keeping context lean | the manager, adoption |
| `codex.md` | Codex specifics: roles, skills folder, what differs from Claude | Codex sessions |
| `status-template.md` | the `status.md` format | whoever writes a task |
| `ledger.md`, `lessons.md`, `review-log.md` | project-owned records: dispatch outcomes, planner lessons, weekly review entries | the manager, the weekly review |

The protocol in one paragraph: a task is written down (`status.md`) with a tier and executable `Done when:`
lines; whoever picks it up claims it on master and works in its own worktree; the builder runs the tier's
checks and sets `REVIEW`; a separate reviewer re-runs them and returns `APPROVE` or `FIX` with findings the
builder can apply; the merge goes through the project's gate; the close moves the folder and copies the
notes to the roadmap; every dispatch gets a ledger row; once a week the harness itself is reviewed.
