# The owner queue

<!--
source: v1 AGENT_PROTOCOL.md (the owner queue) and WORKFLOW.md ("what an agent can do itself"), unchanged in substance
applies: anyone who hits something only the owner can decide or do
review-by: 2027-01-31
-->

`docs/OWNER_QUEUE.md` lists every open decision and action only the owner can take, numbered `Q-NNN`, the
ones blocking the most work first.

- **Only what needs the owner goes here** (owner, 2026-10-06): a decision, or an action that needs the
  owner's identity, accounts, money or devices (signing up or in, accepting terms, buying, a device, a
  setting in a dashboard agents may not touch).
- **What an agent can do itself, it does, after asking once** (owner, 2026-10-06): commands and scripts, a
  dependency install, a download of public data, a dev server, a workflow dispatch, a push where "Who
  pushes" allows it, filling in a report or a ledger. Ask in chat with what will run, what it changes, what
  it costs (an estimate for a paid run), and how to undo it; then do it and report. These are never `Q-`
  items.
- **Paid runs** (owner, 2026-10-05, 2026-10-10): estimate first; a run under the no-yes amount (Workflow
  settings → Paid services) runs without a yes, one at or above it asks; log every run in the ledger the
  setting names; tell the owner at 80 % of the cap; never start a run that would pass the cap without a yes.
- **When you hit one, add a `Q-` item**: what is asked, what it blocks, by when, the options, your
  recommendation, how to answer. A docs commit on master naming only that file. On a task branch, put it
  under `For the roadmap:` in `status.md` instead. A task that can't move without the answer is `BLOCKED`
  with `Blocked on: Q-NNN`.
- **When the owner answers** (in chat or in the file): record the answer and date on the item, move it to
  "Answered", write the decision into the spec or doc it belongs in, unblock the tasks that name it.
- Numbering: one past the highest `Q-` number, checked again right before committing.
