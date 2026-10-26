---
name: clock-out
description: End a session cleanly - status.md with commit, evidence and next step, no debug leftovers, the readiness command passing, a handoff file when the task is unfinished, the board updated in the manager tab. Use before closing a session, before /clear, when context is near 60 %, or when a task is handed to another session.
---

# Clock out

<!--
source: docs/harness/session.md (clock out, clean state), lecture 12's clean-state checklist
applies: the end of any session that did work
review-by: 2027-01-31
-->

Work through every item; say which you could not do and why. The procedure is `docs/harness/session.md`
→ Clock out.

1. **Where things stand.** In the task's `status.md`: `Commit` (the last hash), `Evidence` (every check
   command run this session with its result), `Notes` (what changed and why, decisions with tags), the next
   step, `Updated` (UTC). `Status` is `IN_PROGRESS`, `REVIEW` or `BLOCKED` as the truth is; never `DONE`
   from a builder.
2. **Clean state.** Run the readiness command from `AGENTS.md`; it passes. Search the diff for
   `console.log`, `debugger`, commented-out code, stray files, `TODO` without a task id; remove them or
   turn them into follow-up tasks. `git status --short` in the main checkout shows nothing of yours
   uncommitted.
3. **Unfinished?** Write `handoff-<topic>.md` in the task folder with the five headings from `session.md`
   (Verified now; Changed this session; Broken or unverified; Next best step; Commands). A fresh session
   must be able to continue from it and the repository alone.
4. **For the roadmap.** Follow-ups and open questions under `For the roadmap:` in `status.md`; on master,
   write small tasks and `Q-` items down now.
5. **Commit** your paths only: `git commit -m "<type>(task-NNN): <what> + status" -- <paths>`.
6. **If you commit on master** (a claim, a close, a `Q-` item): refresh the board's `Next step:` and
   `Current issues:` in the same commit. **If you built or reviewed outside the manager tab:** append your
   ledger row. **Manager tab:** also the Running rows reconciled, the ledger rows for today's reports,
   `docs(manager): board` committed; push as "Who pushes" says.
7. Say, in one line, what the next session should do first.

## Tool notes

Claude Code: run `/clock-out`, then `/clear` if you are handing off. Codex: the same list; mention in the
final response that a handoff file exists and where.
