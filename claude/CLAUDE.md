# Claude-specific

The shared workflow's rules for Claude Code only. A project's `CLAUDE.md` imports this file after
`WORKFLOW.md` and before its own `AGENTS.md`.

## Execution plans: subagent-driven by default

- **A plan you write is executed subagent-driven** (`superpowers:subagent-driven-development`): a fresh
  subagent per task, then a spec review and a code-quality review. Don't ask the owner which execution
  approach to use, and skip the choice `superpowers:writing-plans` offers at its end. If the owner wants
  another approach, they say so before asking for the plan.
- **Each task in the plan names the subagent that does it**, one of the definitions in `~/.claude/agents/` (the
  shared repo's `claude/agents/`):

  | Agent | Model, effort | For |
  |---|---|---|
  | `opus-high` | Opus, high | Most tasks, and every review (a plan task, a whole branch before the merge, a task built from its `status.md`). The default. |
  | `sonnet-high` | Sonnet, high | Only simple, straightforward, well-scoped tasks: a clear recipe, exact files, an obvious test. |
  | `opus-xhigh` | Opus, xhigh | Very challenging tasks: the project's hard areas (Workflow settings → Hard areas), concurrency, a hard bug. Also the review of a task built at xhigh or above, or of a branch in one of the project's hard areas (a migration included) or with concurrency. |
  | `opus-max` | Opus, max | The hardest ones, where xhigh is not enough. Your judgement. |

  Never below high effort. A review takes at least the effort of the task it reviews.
- **Every review is by Opus** (owner, 2026-10-13; this replaces the 2026-10-12 rule that a planned task was
  reviewed by a Fable subagent). Fable writes every brief, spec and plan in the manager tab and never runs as a
  subagent, neither to build nor to review. A plan task, a whole branch and a task built from its `status.md`
  are all reviewed by `opus-high`, or by `opus-xhigh` when the builder ran at xhigh or above or the branch is in
  one of the project's hard areas (a migration included) or has concurrency (the builder's definition when that
  is higher still).
- **Dispatch with `subagent_type` set to that agent and `model` passed explicitly** (the global rule). The
  Agent tool cannot set effort per call; the definition's `effort` does, which is why there is one definition
  per level. Never a Fable subagent.

## The manager tab

- **`/manager` is Fable's role in the owner's pinned tab** (`~/.claude/skills/manager/SKILL.md`, the shared
  repo's `claude/skills/manager/`): it briefs, specs and plans with the owner, and dispatches the table above for
  building and reviewing. Its state is `docs/manager/board.md`; its context is disposable (it hands off at 60 %:
  write the board, `/clear`, `/manager`).
- **A subagent the manager dispatched** has this file loaded and the manager's prompt. It reports in the shape
  the prompt asks and never asks a question, merges or pushes: a decision it needs goes in `status.md` as
  `Blocked on:` and in its report.
