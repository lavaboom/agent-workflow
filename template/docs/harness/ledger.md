# Outcomes ledger

One row per dispatch (`docs/harness/model-policy.md` → The ledger). Written by the manager when a report
arrives, or by a Codex session for its own dispatches. `node <agent-workflow>/bin/agent-workflow.mjs ledger`
reads it. Keep the column order; no `|` inside a cell; dates are UTC.

Columns: `date` ISO date · `task` task-NNN · `step` build/review/fix · `role` builder/reviewer/explorer ·
`tool` claude/codex · `model` sonnet/opus/haiku/luna/sol/… · `effort` low/medium/high/xhigh/max · `tier`
docs/static/unit/integration/e2e · `round` 1, 2, 3 · `outcome` approve/fix/escalated/blocked/abandoned/done
· `layer` spec/context/environment/verification/state/capability/none · `note` a few words.

## Rows

| date | task | step | role | tool | model | effort | tier | round | outcome | layer | note |
|---|---|---|---|---|---|---|---|---|---|---|---|
