# Maintaining the harness

<!--
source: the owner's brief of 2026-10-26 (lean, evolving per project phase, weekly review); lectures 2, 4 and 12 (ablation, instruction SNR, harness rot)
applies: the weekly harness review; anyone changing a rule
review-by: 2027-01-31
-->

A harness rots like code: rules pile up, each one reasonable, until the signal drowns. This document is the
routine that keeps it small and current. The review is run once a week by the manager (`/harness-review`)
or by a Codex session, and takes a short session. It is due when the newest entry in `review-log.md` is
seven or more days old: `<Harness CLI> check` reports `review-due`, and the manager reads the same date at
the start of every turn and runs the review or asks (`manager.md` → The weekly review).

## What every rule and topic document carries

A header block (an HTML comment or YAML frontmatter) with three lines:

```
source:    why the rule exists (the brief, the owner decision, the lecture, the incident)
applies:   when it loads or matters (every session; a path; a phase; a role)
review-by: a date, or a phase such as "launch"
```

A rule without a `source` is a rule nobody can retire. A `review-by` in the past is a prompt to decide:
keep (new date), move (to a topic document, loaded on demand), or delete.

## The weekly review

1. **The numbers.** `<Harness CLI> ledger` (and `--usage`): Sonnet share,
   first-pass approval per model, fix rounds per model and tier, escalations, failure layers, overkill
   candidates. Move the ladder (`model-policy.md`) when the numbers say so: Sonnet approved first pass on a
   tier for two weeks running is the default there; Opus approved first pass on `docs`/`static`/`unit` three
   times is a downgrade candidate; Sonnet escalated twice on the same kind of task gets a lesson, not a
   permanent upgrade.
2. **The lessons.** Each `fix`, `escalated` or `blocked` row with layer `spec` or `context` becomes or
   updates a lesson in `lessons.md`; one that recurs becomes a line in the "Sonnet-ready" checklist of
   `model-policy.md` or a rule. Lessons that stopped recurring are retired with the date.
3. **The rules.** `<Harness CLI> check`: entry-file size, number and size of
   always-on rules, missing metadata, past `review-by`, drift from the template, the board's mandatory
   lines. For each always-on rule, ask: did any dispatch this week need it? Would removing it change a
   decision? If not, move it to a topic document or delete it. A rule added this week because of one
   incident is suspect: a check (lint, test, path-scoped rule) usually beats a sentence. The `Named in fix
   notes:` line of `ledger` says which rules and documents the week's fixes pointed at (the `note` column
   names them, `model-policy.md` → The ledger): a file named often is sharpened or turned into a check; a
   rule never named and never needed is moved.
4. **The phase.** `AGENTS.md` → Workflow settings → Phase. A phase change retires the matching
   `.claude/rules/phase-*.md` and may add the next one (launch brings the public-text review, security and
   data-retention rules; maintenance brings dependency and backup checks).
5. **The tooling.** `ecc-install.json`, `.mcp.json`, enabled plugins (`tooling.md`): which installed pieces
   were used by a dispatch this week? Each unused piece for a month is removed (it costs context every
   session). Each need that came up without a tool (a recurring review finding, a manual check) gets one.
6. **The template.** `manifest.json`'s `templateVersion` against the latest tag of the `agent-workflow`
   repository; `<Harness CLI> sync --dry-run` lists what would change; apply
   it when no dispatch is running. A local edit to a managed file is a conflict: either upstream it (a
   commit and tag in the template repository, then `sync --take-template`) or keep it (`--keep-local`) and
   note why in the review entry.
7. **The fresh-session test** (`session.md`), once a month, or after a large change to the docs.
8. **Ablation**, once a month: pick one harness component (a rule, a hook, a skill, an installed ECC piece),
   disable it for a week, and read the ledger. No change: remove it. Worse numbers: restore it or replace it
   with something lighter. Disable without deleting: a rule file gets the suffix `.off` (`core.md.off` is not
   loaded), a hook comes out of `.claude/settings.json`, a skill folder gets `.off`, an ECC piece comes out
   of `ecc-install.json`; the entry's `Ablation:` line names the component and the date it comes back, and
   the next review whose date is past that decides. The manager proposes the component in the review; it is
   not automatic beyond that.
9. **The entry.** Append to `review-log.md`: date, the numbers in one line, what was removed, added,
   emphasised, moved; the ladder change if any; the ablation running, if any.

## Changing a managed file

Managed files (`manifest.json` → `policy: managed`) are the same in every project; the upstream is the
`agent-workflow` repository (the Harness CLI setting names its path). A change that every project should get is a commit there, tagged, then
`sync` in each project; a change for this project only is an `owned` file (`AGENTS.md`, `hard-areas.md`,
`phase-*.md`, `settings.json`) or a "Workflow overrides" line with the owner's yes. Editing a managed file in
place works, but `sync` will report it as a conflict every time until it is upstreamed or recorded with
`--keep-local`.

## Adding a rule: the test

Before adding a sentence to `AGENTS.md` or a `.claude/rules/` file, answer:

- Which incident or decision is the source? (If none, do not add it.)
- When does it apply? If to a path, give it `paths:`; if to a phase, name it `phase-*.md`; if to one role,
  put it in that role's definition or prompt recipe; if only sometimes, it is a topic document.
- Could a check enforce it instead? A lint rule, a test, a hook, a tier command: prefer the check.
- When will it be reviewed? Write the date.
