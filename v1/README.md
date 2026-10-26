# agent-workflow

One way of working for every project the owner runs with coding agents: the manager tab, Fable planning,
Opus and Sonnet subagents building and Opus reviewing, task folders, the roadmap, the owner queue and the
merge gate. The rules live here once; every project points at them, so a change to the workflow is one commit
here and every project uses it from its next session on.

## What is here

| Path | What |
|---|---|
| `WORKFLOW.md` | The shared rules for every agent, Claude and Codex: code philosophy, the agent instructions, Codex's subagent rules, keeping docs. |
| `AGENT_PROTOCOL.md` | The task flow: places, task states, picking up and claiming, planning, small tasks, groups, the manager, the owner queue, `status.md`, building, finishing, reviewing and closing, worktrees, shared local services. |
| `TASKS.md` | The task folders: layout, names, the files in a folder, links. |
| `claude/CLAUDE.md` | Claude only: subagent-driven plans, the agent table, every review by Opus, the manager tab. |
| `claude/agents/` | The four subagent definitions (`opus-high`, `opus-xhigh`, `opus-max`, `sonnet-high`). |
| `claude/skills/manager/` | The manager skill (`SKILL.md`) and its dispatch recipes (`dispatch-prompts.md`). |
| `templates/` | A new project's starting files: `status.md`, `board.md`, `OWNER_QUEUE.md`, `ROADMAP.md`, `tasks/README.md`, and the `AGENTS.md` "Workflow settings" block (`workflow-settings.md`). |
| `install.ps1` | Creates the user-level junctions below. Idempotent; `-Check` only reports. |

The shared files never name a project, a command or a path of one. They name a project's **Workflow
settings** ("the project's gate (Workflow settings)"): a table in each project's `AGENTS.md`, the only place
projects differ. The fixed project paths are not settings: `docs/ROADMAP.md`, `docs/OWNER_QUEUE.md`,
`docs/manager/board.md`, `docs/tasks/active/` and `docs/tasks/completed/`, `docs/external-spend.md`.

## How a project uses it

- **Claude** loads the rules through the project's `CLAUDE.md`, which is three import lines:

  ```
  @C:/code/agent-workflow/WORKFLOW.md
  @C:/code/agent-workflow/claude/CLAUDE.md
  @AGENTS.md
  ```

  Claude Code asks once per project before it loads an import from outside the project. `/memory` lists the
  imported files.
- **Codex** reads them because the project's `AGENTS.md` opens with "This project follows the shared workflow:
  read `C:/code/agent-workflow/WORKFLOW.md` first".
- **`AGENT_PROTOCOL.md` and `TASKS.md`** are read on demand; `WORKFLOW.md` names them with their full path. The
  project keeps `docs/AGENT_PROTOCOL.md` and `docs/tasks/README.md` as short pointers, so old links still work.
- **The agents and the manager skill** are user-level: `~/.claude/agents` and `~/.claude/skills/manager` are
  directory junctions to `claude/agents` and `claude/skills/manager` (run `install.ps1` once per machine). A
  project keeps no copy of its own: a project's definition would win over the user-level one of the same name.

## Changing the workflow

- A change is an edit and a commit here (`git commit -- <paths>`), made from whichever project's manager tab
  the owner is in, with the `(owner, <date>)` tag in the rule. This repository's history is the workflow's
  changelog.
- It takes effect at the next session start, for every project at once. A manager tab already running picks
  it up after its next clear. A subagent dispatched after the commit has it.
- Don't change the workflow while a manager has subagents running (their prompts were written under the old
  rules).
- A project fact goes in the project's Workflow settings, not here. A project overrides a shared rule only
  under its "Workflow overrides" setting, with the owner's yes.
- Not covered: cloud sessions and CI cannot see `C:\code\agent-workflow`. CI needs none of it.

## A new project's checklist

1. Paste `templates/workflow-settings.md` into the project's `AGENTS.md`, near the top, and fill in every value.
2. Write the project's `CLAUDE.md` as the three import lines above.
3. Copy `templates/ROADMAP.md`, `templates/OWNER_QUEUE.md` and `templates/board.md` into `docs/`,
   `docs/OWNER_QUEUE.md` and `docs/manager/board.md`, and `templates/tasks/README.md` into `docs/tasks/`. New
   task folders start from `templates/status.md`.
4. Write `docs/AGENT_PROTOCOL.md` as a pointer to this repository's `AGENT_PROTOCOL.md`.
5. Write the project's Local services doc (the shared services agents must not restart, how to make a test
   user, dev server notes), and `docs/external-spend.md` when the project pays for a service.
6. Delete any project copy of `.claude/agents/` or `.claude/skills/manager/`, and run `install.ps1 -Check`
   (then `install.ps1` if a junction is missing).
7. In a fresh session: `/memory` lists both imports, `/agents` shows the four agents, `/manager` loads.
