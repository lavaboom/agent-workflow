<!--
source: the owner's pre-launch rules from v1 (owner, 2026-10-03 and 2026-10-04); a phase rule
applies: while AGENTS.md → Workflow settings → Phase is "pre-launch"
review-by: launch (the harness review retires this file when the phase changes)
-->

# Phase: pre-launch

- **Tasks are about code, not wording** (owner, 2026-10-03). No task, follow-up or `Q-` item about how
  public-facing text is worded (pages, UI copy, emails, user docs, legal pages); write plain clear text and
  move on. Every public-facing text gets one review before launch (a roadmap entry).
- **Legal and user-facing text is placeholder until launch** (owner, 2026-10-04). Don't update the privacy
  policy, the terms or their effective date when what is stored changes; a wording gap is not a review
  finding; in a merge conflict on these files take the simplest side that compiles. At most, note the change
  once under `For the roadmap:` in `status.md`. This covers wording only: safety rules, privacy rules and
  product boundaries stay in force.
