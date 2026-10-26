<!--
source: agent-workflow v2 core rules; the non-negotiables that bite in daily work (owner tags kept from v1)
applies: every Claude Code session in this project; Codex has the same text in AGENTS.md → Hard constraints
review-by: 2027-01-31
-->

# Core rules

- **Where you work.** Every edit and command runs in the task's worktree by its full path (Workflow settings
  → Worktrees), never in the folder the session opened in (`docs/harness/places.md`). Never in an app-made
  `.claude/worktrees/` folder.
- **What done means.** A task is done when its acceptance checks pass and a separate reviewer says `APPROVE`.
  "Looks right" and "tests I did not run" are not evidence (`docs/harness/verification.md`).
- **Stay in your lane.** Touch only your task's `Touches:` paths; widen `Touches:` in `status.md` and say so,
  or write a follow-up task (`docs/harness/building.md`). Never edit a path another running task names
  (owner, 2026-10-22).
- **Write it down, not in chat.** Decisions go in the spec or `status.md` with a tag `(owner, date)` or
  `(manager, date)`; follow-ups go under `For the roadmap:`; owner questions become `Q-` items. Chat is lost
  at the next session.
- **Commit your own paths only.** `git commit -- <paths>`; never `git add -A`, `git add .` or `commit -a` in
  the main checkout. Nothing is committed on master while a merge batch runs (owner, 2026-10-22).
- **A worker never merges, pushes or opens a PR.** It sets `REVIEW` and stops. Pushing follows the "Who
  pushes" setting (owner, 2026-10-22); a production promote needs the owner's yes in the session.
- **Shared machine.** Never restart a shared local service without the owner's yes; browser checks that write
  use your own test user; run only the integration files your change touches while iterating
  (`docs/harness/places.md`).
- **Root causes.** No quick fixes or workarounds unless the owner asks; a hack that must stay becomes a
  `BACKLOG` task with a deadline (owner, 2026-10-22).
- **Before you stop.** `status.md` holds the commit, the evidence and the next step; no debug leftovers; the
  readiness command still passes (`docs/harness/session.md`).
