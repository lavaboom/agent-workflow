# Ledger

Fixture with known numbers; see tests/ledger.test.mjs for the expected summary.

## Rows

<!-- one row per dispatch -->

| date | task | step | role | tool | model | effort | tier | round | outcome | layer | note |
|------|------|------|------|------|-------|--------|------|-------|---------|-------|------|
| 2026-10-10 | task-000 | build | builder | claude | opus | high | unit | 1 | built | none | before the window |
| 2026-10-10 | task-000 | review | reviewer | claude | opus | high | unit | 1 | approve | none | |
| 2026-10-20 | task-001 | build | builder | claude | sonnet | medium | docs | 1 | built | none | |
| 2026-10-20 | task-001 | review | reviewer | claude | opus | high | docs | 1 | approve | none | |
| 2026-10-21 | task-002 | build | builder | claude | sonnet | high | unit | 1 | built | none | |
| 2026-10-21 | task-002 | review | reviewer | claude | opus | high | unit | 1 | fix | spec | missed the error shape |
| 2026-10-21 | task-002 | fix | builder | claude | sonnet | high | unit | 2 | built | none | |

| 2026-10-22 | task-002 | review | reviewer | claude | opus | high | unit | 2 | approve | none | |
| 2026-10-22 | task-003 | build | builder | claude | opus | high | static | 1 | built | none | |
| 2026-10-22 | task-003 | review | reviewer | claude | sonnet | medium | static | 1 | approve | none | |
| 2026-10-23 | task-004 | build | builder | claude | sonnet | high | integration | 1 | built | none | |
| 2026-10-23 | task-004 | review | reviewer | claude | opus | high | integration | 1 | fix | context | |
| 2026-10-23 | task-004 | fix | builder | claude | sonnet | high | integration | 2 | built | none | |
| 2026-10-24 | task-004 | review | reviewer | claude | opus | high | integration | 2 | fix | verification | |
| 2026-10-24 | task-004 | fix | builder | claude | sonnet | high | integration | 3 | built | none | |
| 2026-10-24 | task-004 | review | reviewer | claude | opus | high | integration | 3 | escalated | capability | moved to opus |
| 2026-10-24 | task-005 | build | builder | codex | luna | high | unit | 1 | built | none | |
| 2026-10-24 | task-005 | review | reviewer | codex | sol | high | unit | 1 | approve | none | |
| 2026-10-25 | task-006 | build | builder | codex | sol | high | docs | 1 | built | none | |
| 2026-10-25 | task-006 | review | reviewer | claude | opus | high | docs | 1 | approve | none | |
| 2026-10-25 | task-007 | build | builder | claude | haiku | low | docs | 1 | built | none | not reviewed yet |
| 2026-10-25 | task-001 | close | reviewer | claude | opus | high | docs | 1 | done | none | merged |

## Notes

Anything below the next heading is not part of the table.
