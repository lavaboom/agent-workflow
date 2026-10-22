# WORKFLOW.md

The shared way of working for every agent (Claude Code, Codex) in every project that follows this workflow.
Each project's `AGENTS.md` names it at the top and holds the project's own rules and its `## Workflow settings`:
the commands, paths and lists the rules below refer to by name ("the project's gate (Workflow settings)"). A
setting is the only place projects differ; a project overrides a shared rule only under "Workflow overrides",
with the owner's yes.

Claude loads this file through the project's `CLAUDE.md`; Codex reads it because the project's `AGENTS.md` says
to. The rest of the shared workflow is in `C:/code/agent-workflow/`: `AGENT_PROTOCOL.md` (the task flow),
`TASKS.md` (the task folders), `claude/CLAUDE.md` (Claude only), `claude/agents/` and `claude/skills/manager/`.

## Code Philosophy

Every piece of code in this project must satisfy three non-negotiable properties, in this order:

1. **Testable** — Logic lives in functions with explicit inputs and outputs. No hidden side effects, no god components. Queries and actions are in dedicated files so they can be tested in isolation without rendering a page.
2. **Documentable** — Each module has a single, statable responsibility. If you can't describe what a file does in one sentence, it should be split. File and function names are the primary documentation.
3. **Human readable** — Prefer boring, explicit code over clever abstractions. A future reader should understand the intent at a glance. Flat is better than nested. Short functions are better than long ones.

When these three conflict with brevity or DRY, lean toward readability. Duplication is acceptable; confusion is not.

## Agent instructions

Before doing any work, read:

1. `C:/code/agent-workflow/AGENT_PROTOCOL.md`: picking up and claiming a task, task states, `status.md`, review,
   merge and close.
2. `docs/ROADMAP.md` **as it is on master** (`git show master:docs/ROADMAP.md`), not your worktree's copy.
3. Your task's folder under `docs/tasks/active/` (`status.md`, then its spec and plan).

In short:

- **The owner runs the flow from one pinned manager tab** (`/manager`, the shared repo's
  `claude/skills/manager/SKILL.md`; `AGENT_PROTOCOL.md` → "Orchestrated mode"; owner, 2026-10-10). It briefs,
  specs and plans with the owner, dispatches a subagent per task and per review, merges and closes, and keeps its
  state in `docs/manager/board.md`. A subagent it dispatches follows this file, the project's `AGENTS.md` and its
  prompt, reports in the shape the prompt asks, and never asks, merges or pushes. Everything below still holds for
  every agent, dispatched or not.
- **"Pick up task-NNN" is all an agent needs.** It reads the task's `status.md` on master and follows
  `AGENT_PROTOCOL.md` → "Picking up a task": it claims an unclaimed task itself (a claim commit on master,
  made in the main checkout), creates the task's worktree, and works there. A task someone else owns, or one
  that is `BLOCKED` or `DONE`, it leaves alone and says why.
- **All work happens in the task's worktree** (Workflow settings → Worktrees) on branch
  `task/task-NNN-<slug>`, **not in the folder your session opened in.** A desktop-app session stays in the
  folder it started in (the main checkout, or an app-made `.claude/worktrees/…`), so use the worktree's full
  path for every file edit and command, and start the dev server from the worktree.
- **Other agents share this machine** (`AGENT_PROTOCOL.md` → "Shared local services"): never restart a shared
  local service without the owner's yes (the project's Local services doc, Workflow settings, names them);
  browser checks that change data use a test user of your own, not the shared one.
- **The main checkout only takes docs commits for claims, closes and planning**; code reaches master only
  through the project's merge command (Workflow settings → Merge). Commit only your own paths there
  (`git commit -- <paths>`), never `git add -A`. Nobody edits `docs/ROADMAP.md` on a task branch: roadmap
  notes go in `status.md`, and the claim and close commits copy them over.
- **Specs and plans for a task nobody is building yet are written on master**, with no worktree, and
  committed after every edit (`AGENT_PROTOCOL.md` → "Planning without building").
- **A worker never merges or pushes.** When its work is committed and its gates pass, it sets `status.md`
  to `REVIEW` and stops. Review, merge and close are the reviewer's (the protocol's "Reviewing and closing").
- **Every doc for a task lives in its folder**, `docs/tasks/active/task-NNN-<slug>/`, named
  `brief-<topic>.md`, `spec-<topic>.md`, `plan-<topic>.md`, `handoff-<topic>.md` or `research-<topic>.md`, plus
  `status.md` (`TASKS.md`). Don't write to `docs/superpowers/`.
- **These rules override skill and tool defaults.** Skills that save specs and plans elsewhere
  (`superpowers:brainstorming`, `superpowers:writing-plans`) save them in the task folder. Skills and apps
  that create worktrees elsewhere (`superpowers:using-git-worktrees`, the Claude desktop app's
  `.claude/worktrees/`) use the project's worktrees folder (Workflow settings → Worktrees; the exceptions are in
  `AGENT_PROTOCOL.md` → "Worktrees").
- **Finishing up a session or an agent's work** (`superpowers:finishing-a-development-branch` and the like)
  means setting the task to `REVIEW`, not merging or opening a PR.
- **A follow-up or small fix is written down as a task when it is noticed**: a `BACKLOG` folder whose
  `status.md` is its spec (problem, evidence, touches, done-when, `With:` / `After:` the tasks it hangs on),
  under its feature on the roadmap (`AGENT_PROTOCOL.md` → "Small tasks and follow-ups"). The agent that
  picks one up first confirms it still exists. Closing a task checks every follow-up that names it.
- **Group small ready tasks** (owner, 2026-10-07). When you create or list tasks that can be implemented
  straight from their `status.md`, group the related ones (same files, same SQL function or migration, same
  feature) that one agent can build in one session, write the group into each member's `status.md`, and tell
  the owner each group's lead, members, agent and which groups can run side by side. A group is claimed with
  "pick up task-NNN" for its lead, built on the lead's branch, and reviewed, merged and closed together by one
  reviewer (`AGENT_PROTOCOL.md` → "Groups").
- **When you create tasks, tell the owner what each needs** (owner, 2026-10-05), in your reply: for every new
  task, whether it needs a spec, a plan, both, or can be implemented straight from its `status.md`. For one that
  can be implemented now, recommend the agent's model and effort (Claude: the agent table in
  `claude/CLAUDE.md`; Codex: "Codex subagent model selection" below); the owner writes plans with Fable, so
  don't recommend a model for those. When you create more than one, say which can be done concurrently and
  which must wait for another, and make their `After:` lines say the same.
- **A chip (`spawn_task`) is only a pointer to a written-down task**: its prompt says "pick up task-NNN".
  The owner starts chips with "Do locally": that session opens in the main checkout, where the claim
  happens. "Start with worktree" leaves an unused `.claude/worktrees/` worktree and branch behind.
- **Anything only the owner can decide or do goes in `docs/OWNER_QUEUE.md`** as a `Q-NNN` item (what it
  blocks, by when, options, a recommendation), never only inside a spec. A task waiting on one says
  `Blocked on: Q-NNN`.
- **What an agent can do itself, it does, after asking the owner's permission** (owner, 2026-10-06). Never hand
  the owner steps an agent can run: commands and scripts, a dependency install, downloads of public data, a dev
  server, a workflow dispatch, a push, filling in a report or a ledger. Ask once, in chat, with a request the
  owner can review: what will run, what it changes, what it costs (an estimate for a paid run), and how to undo
  it. Then do it and report. The owner is asked to act only for what needs the owner's own identity, accounts,
  money or devices, or a decision: signing up or signing in, accepting terms, buying, a phone or other device, a
  setting in a dashboard agents may not touch (for example a hosting provider's environment variables), a
  choice. Those are `Q-NNN` items; a step an agent can do with permission is not. The other rules still hold: a
  paid run needs the owner's yes for that run (the project's cap, Workflow settings → Paid services), and a push
  or a production promote needs the owner's yes in the session.
- **Until 1.0, tasks are about code, not wording** (owner, 2026-10-03). Don't create tasks, follow-ups or
  owner questions about the wording of public-facing text (pages, UI copy, emails, user docs, blog, legal
  pages), and don't hold work for it: write plain, clear text as you go and move on. Every public-facing
  text is reviewed once, before launch (an entry on the project's `docs/ROADMAP.md`).
- **Legal and user-facing text is placeholder until launch** (owner, 2026-10-04). Don't update the Privacy
  Policy, the Terms or the project's legal effective date when what we store or who processes data changes, and
  don't dispatch agents to write, fix or review legal pages, UI copy or user docs. Placeholder text is fine. A
  wording or legal-fact gap is not a review finding. In a merge conflict on these files, take the simplest side
  that compiles and keep the tests passing. At most, note the change once in the task's `status.md` under "For
  the roadmap", for the legal review the owner starts when the product is ready to launch.
- **External commercial services cost at most the project's cap** (owner, 2026-10-05; Workflow settings → Paid
  services): any LLM, any other paid API. Before a paid run, estimate it; **a run estimated under the setting's
  no-yes amount needs no yes for that run (owner, 2026-10-10)**, one at or above it does; after, add it to the
  ledger the setting names. Tell the owner when the total passes 80 % of the cap, and never start a run that
  would pass the cap without the owner's yes.

---

## Codex subagent model selection

These rules apply only to Codex, not Claude Code.

- Use Sol subagents for difficult tasks with a fair amount of ambiguity.
- Use Luna subagents for straightforward tasks.
- Choose reasoning effort according to the task's difficulty and ambiguity.
- Let already-dispatched subagents finish their current work before applying this policy to new subagent dispatches.

## Documentation: rules for future agents and developers

The project's `docs/` folder is the authoritative reference for its codebase (its `AGENTS.md` lists the files).

1. **Refer to docs/** before starting any task. Don't deduce conventions from scratch — they're already written down.
2. **Update docs/ when you change code substantially.** Adding a new feature, changing a data flow, or making an architectural decision? Update the relevant doc file in the same commit. Docs that drift from the code are worse than no docs.
3. **Keep docs human-readable.** Write for the next developer, not for a machine. Short sentences, concrete examples, and explicit gotchas are worth more than exhaustive coverage of obvious things.
4. **Keep `docs/ROADMAP.md` current** (only in claim, planning and close commits on master; on a task branch, roadmap notes go in `status.md`, see `AGENT_PROTOCOL.md`). When a task is claimed, its entry gets the task ID, state, owner and branch; when it merges, it moves to Shipped with the date and commit. When the owner asks for a new feature, add it where it logically belongs in the order (not at the end), with the owner's decisions and open questions. Features the owner rules out go to its Out of scope section.

## Codex-specific
- Use subagents for independent implementation/review tasks. The parent session owns integration and final verification.
- Whenever compaction happens mid task, mention it at the end and write handoff documents for it so we can continue in another tab fresh.
- If you discover useful work that is outside the current task's scope:
  - Do not implement it automatically.
  - Record it under `Follow-ups` in the current task's status/completion file.
  - Give each item a short title, rationale, and estimated scope.
  - Mention the follow-ups in your final response.
  - Do not add them to the roadmap unless explicitly instructed.
