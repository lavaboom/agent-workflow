<!--
source: agent-workflow v2; the status.md format (from v1 AGENT_PROTOCOL.md → status.md, plus Tier and Evidence)
applies: creating or updating a task's status.md; copy the block below into a new task folder
review-by: 2027-01-31
-->

# status.md template

Copy the block, fill every line, keep the order. Times are UTC. `Owner` is `claude:` or `codex:` plus a
short name (`claude:manager`, `codex:task-017`). A small task's `status.md` is also its spec.

```
Task: task-NNN-<slug>
Status: BACKLOG
Owner: none
Branch: task/task-NNN-<slug>
Worktree: ../<project>-worktrees/task-NNN-<slug>
Created: <YYYY-MM-DD>, from <the task, review or request that found it>
With: (none)          # same files or area: cheapest done by that task's builder, or right after it
After: (none)         # can't start before these are DONE
Blocked on: (none)    # an open owner question, e.g. Q-007
Touches: <paths, the narrowest true set, one line>
Tier: <docs | static | unit | integration | e2e>
Commit: (none)
Updated: <YYYY-MM-DDTHH:MMZ>

Problem: what is wrong, or what is wanted, in two or three lines.
Evidence of the problem: where it shows (a warning, a test, a review note).
Done when:
- <command or observation> → <expected result>      # executable; never "tests pass"
- <...>
Not in scope: what not to do here.

Evidence:
- (each check command the tier names, with its result, written by the builder; the reviewer re-runs them)

Notes:
- (the build log: what changed, the commit, decisions made on the branch with their tags)

For the roadmap:
- (follow-ups, owner decisions or open questions to copy to docs/ROADMAP.md and docs/OWNER_QUEUE.md at the close)
```

`Tier` and `Done when:` are written at planning time (the manager or whoever writes the task) and are the
reviewer's contract. `Evidence:` is the builder's claim; a review that finds it untrue is a `FIX` with the
failure layer `verification` in the ledger.
