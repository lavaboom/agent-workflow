# {{PROJECT}}

<!-- The entry file for every coding agent (Claude Code, Codex, others). Keep it under 100 lines: it is a
     map, not a manual. Details live in docs/harness/ and are read on demand. Harness: agent-workflow v2. -->

**What this is:** <one or two sentences: what the product does and for whom>.
**Stack:** <framework, language, database, hosting, in one line>.

## Start here (every session)

| Question | Where the answer is |
|---|---|
| What is next, what is broken | `docs/manager/board.md` (`Next step:`, `Current issues:`), then `docs/ROADMAP.md` → In progress |
| What waits on the owner | `docs/OWNER_QUEUE.md`, open `Q-` items |
| My task | `docs/tasks/active/task-NNN-<slug>/status.md`, its spec and plan |
| How the flow works | `docs/harness/README.md` (which document each role reads) |
| How the code is organised | <`docs/architecture.md` or the folder that holds the design docs> |

Then run the readiness command below. A failing baseline is fixed before any new work (`docs/harness/session.md`).

## Commands

```bash
<install>            # e.g. npm ci
<readiness>          # the one command that proves the checkout is sound (build or typecheck + a smoke test)
<dev server>         # from the task's worktree, on a port of its own
```

Verification tiers (`docs/harness/verification.md`): the commands each tier runs, in this project.

| Tier | Commands |
|---|---|
| `docs` | <link or format check, or "(none)"> |
| `static` | <lint>; <typecheck> |
| `unit` | `static` + <unit test command, by file> |
| `integration` | `unit` + <integration test command, by file>; branch database when there is a migration |
| `e2e` | `integration` + <browser flow command or manual flow from the task's dev server> |

## Hard constraints

1. All work happens in the task's worktree on `task/task-NNN-<slug>`, never in the main checkout; the main checkout takes only docs commits for claims, closes and planning (`docs/harness/places.md`).
2. A task is done when its reviewer says `APPROVE` against its acceptance checks, never when it looks done; the builder never grades its own work (`docs/harness/verification.md`).
3. Change only the paths your task's `Touches:` names; a needed change outside them is a follow-up task or a widened `Touches:`, said in the report (`docs/harness/building.md`).
4. Never restart a shared local service without the owner's yes in this session; browser checks that write use a test user of your own (`docs/local-services.md`).
5. Commit only your own paths (`git commit -- <paths>`), never `git add -A`; nobody commits on master while a merge batch runs.
6. A worker never merges, pushes or opens a PR; it sets `REVIEW` and stops. Who pushes is a Workflow setting.
7. Fix root causes; a workaround that must stay becomes a `BACKLOG` task with a deadline (owner, 2026-10-22).
8. Anything only the owner can decide or do is a `Q-NNN` item; what an agent can do itself it does, after asking once in chat (owner, 2026-10-06).
9. Paid runs: estimate first; under the no-yes amount run and log it, at or above it ask (owner, 2026-10-10).
10. <project-specific constraint, e.g. personal information is never committed; run the check before every commit>
11. <project-specific constraint>

## Workflow settings

The values the shared documents name ("the merge command (Workflow settings)"). The only place projects differ.

| Setting | Value |
|---|---|
| Main checkout | `<absolute path>` |
| Worktrees | `../<project>-worktrees/task-NNN-<slug>/` |
| Prepare a worktree | <copy env files from the main checkout; the install step> |
| Branch database | <start and cleanup commands, or (none)> |
| Gate | <the command that runs every check before a merge> |
| Merge | <the command that merges branches into local master through the gate> |
| Gate log | <command, or (none)> |
| Capacity | <command answering dispatch / dispatch-without-stack / wait, or (none)> |
| Check before a docs commit | <command, or (none)> |
| Hard areas | <paths or topics that always get an Opus builder and reviewer; mirrored in `.claude/rules/hard-areas.md`> |
| Rules every builder prompt names | <section names in this file the dispatch pastes one line of> |
| Docs a builder reads for a task | the task folder<; the design doc of the area it touches> |
| The product's user, in a brief | <a user, a customer, a parent…> |
| Paid services | <cap; no-yes amount; ledger file> |
| Who pushes | <only the owner; or who pushes what and when> |
| Phase | <pre-launch / launched / maintenance> (drives `.claude/rules/phase-*.md`) |
| Workflow overrides | (none) |

## Topic documents

`docs/harness/README.md` is the index. The ones every agent needs: `task-flow.md` (states, claiming),
`places.md` (checkouts, worktrees, shared services), `building.md` (working and finishing), `verification.md`
(tiers, the reviewer contract), `session.md` (clock in, clock out). The manager also reads `manager.md`,
`model-policy.md` and `maintenance.md`. Codex sessions read `codex.md` once.
