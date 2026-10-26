---
paths:
  - "<the project's hard areas, e.g. supabase/migrations/**>"
  - "<e.g. src/lib/money/**>"
source: this project's Workflow settings → Hard areas (fill the paths above; delete this file if the project has none)
applies: editing a file in a hard area
review-by: <an ISO date three months after adoption>
---

# Hard areas

You are editing a path the project lists under Hard areas (`AGENTS.md` → Workflow settings).

- The builder and the reviewer of this task are Opus at `xhigh` (`docs/harness/model-policy.md`). If you are
  a Sonnet builder here, stop: set `Blocked on: hard area needs an Opus builder` in `status.md` and report.
- The tier is at least `integration`; a migration always gets a branch database (Workflow settings → Branch
  database) and its integration files run there.
- <project-specific rule, e.g. money is integer minor units; never a float>
- <project-specific rule, e.g. every table has RLS; a policy change ships with a test that reads as another user>
