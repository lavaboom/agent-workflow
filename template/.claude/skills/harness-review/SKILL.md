---
name: harness-review
description: The weekly review of the harness itself - ledger numbers, the model ladder, lessons, rule metadata and size, phase rules, installed tooling, template version, an optional ablation - ending with an entry in docs/harness/review-log.md. Use once a week, when the owner asks to "review the harness", or after a large change to the instructions.
---

# Harness review

<!--
source: the owner's brief of 2026-10-26 (weekly routine to re-weigh instructions; evolve per phase); docs/harness/maintenance.md is the procedure
applies: once a week, in the manager tab or a Codex session, in the main checkout on master
review-by: 2027-01-31
-->

Run in the main checkout on `master`, with no builder running. The procedure is
`docs/harness/maintenance.md` → The weekly review; this skill is its checklist and its output shape. Do
every step; write "nothing" where nothing applies. Decide, do not only observe: every step ends with a change
or a dated "keep".

1. **Numbers.** Run `<Harness CLI> ledger` and `… ledger --usage`
   (`<Harness CLI>` is the Workflow settings row of that name in `AGENTS.md`; `docs/harness/manifest.json`
   → `templateVersion` says which version this project is on). Paste the summary into the entry. Apply the ladder rules in
   `maintenance.md` step 1; edit `docs/harness/model-policy.md` only through the template repository
   (it is managed); a project-specific ladder change is a "Workflow overrides" line in `AGENTS.md` with the
   owner's yes.
2. **Lessons.** Read the week's `fix`, `escalated` and `blocked` rows with layer `spec` or `context`;
   write or update a lesson in `docs/harness/lessons.md` for each; retire lessons that did not recur for a
   month (keep them under a "Retired" heading with the date).
3. **Rules.** Run `<Harness CLI> check`. For every `warn` or `fail`, act.
   Then read each always-on rule (`.claude/rules/*.md` without `paths:`, and `AGENTS.md` → Hard
   constraints) and ask the two questions from `maintenance.md` step 3, with the `Named in fix notes:` line
   of step 1 beside you: a file named often is sharpened or becomes a check; one never named and never
   needed is moved. Move, delete, or renew the `review-by` date, in that order of preference.
4. **Phase.** Compare `AGENTS.md` → Phase with `.claude/rules/phase-*.md`. Retire or add as the phase says.
   A phase change is the owner's call; ask once if it looks due.
5. **Tooling.** List `ecc-install.json` includes, `.mcp.json` servers, enabled plugins. For each, one line:
   used this week by which dispatch, or not. Remove what was unused for a month; write a `review-by` a
   month out for anything kept on faith.
6. **Template.** `<Harness CLI> sync --dry-run`. Report the version
   difference and the files that would change or conflict. Apply (`sync`) when nothing is running and the
   owner has not asked to hold; resolve conflicts as `maintenance.md` says.
7. **Fresh-session test** (monthly, or after a large docs change): ask a fresh session the five questions;
   fix the file behind each miss.
8. **Ablation** (monthly: when no entry of the last four weeks names one): pick one component to disable
   for the coming week (`maintenance.md` step 8 says how, without deleting), say why, and note it with the
   date it comes back; the next review past that date reads the ledger and decides.
9. **The entry.** Append to `docs/harness/review-log.md`:

   ```
   ## <date>
   Numbers: <the ledger line: sonnet share, first pass per model, rounds, escalations>
   Ladder: <unchanged | the change and why>
   Lessons: <added n, retired n: titles>
   Rules: <removed / moved / renewed: file names>
   Phase: <unchanged | changed to X>
   Tooling: <removed / added / kept on faith>
   Template: <version → version | up to date | held because …>
   Ablation: <none | component, until date>
   ```

   Commit it with the files you changed: `docs(harness): weekly review <date>`, your paths only.

## Tool notes

Claude Code: `/harness-review` in the manager tab; the fresh-session test is a new session in the desktop
app or `claude -p` with the five questions. Codex: run the same checklist; the fresh-session test is a new
Codex session.
