# Tooling: choosing ECC pieces, plugins and MCP servers per project

<!--
source: the owner's brief of 2026-10-26 (lean; evaluate per project, do not stuff everything in); ECC 2.2.3's selective-install design and capability-surface guide; Claude Code plugin docs (every enabled plugin's descriptions load in every session)
applies: adoption and the weekly review
review-by: 2027-01-31
-->

Every tool a session can see costs context before any work starts: a plugin's skills and agents are listed
in every session, an MCP server's tool schemas too. The rule is to install what a recurring need justifies,
per project, and to remove what a month of ledger rows shows unused. This document says how to choose.

## Where a capability belongs (from ECC's surface guide)

| Need | Surface | In this harness |
|---|---|---|
| Always true for matching paths, no judgement needed | a rule | `.claude/rules/<name>.md` with `paths:` |
| A workflow or playbook needed sometimes | a skill | `.claude/skills/<name>/`, mirrored in `.agents/skills/` for Codex |
| A specialist to delegate to, with its own tool scope | an agent | `.claude/agents/<name>.md`, `.codex/agents/<name>.toml` |
| A deterministic check at a lifecycle point | a hook | `.claude/settings.json` → hooks |
| A one-shot local action | a script | `scripts/` plus an npm script |
| A structured tool used repeatedly across sessions | an MCP server | `.mcp.json`, enabled per project |

Start with the smallest surface. Promote a script to a skill when its use needs guidance, a skill to an
agent when it needs its own context, and anything to an MCP server only when a persistent tool boundary pays
for itself.

## ECC as a library

[ECC](https://github.com/affaan-m/ECC) (2.2.3, MIT) ships 71 agents, 311 skills, 97 commands, hooks and
rule packs. This harness does not install it as a plugin (the whole catalogue would load in every session),
and it does not use ECC's installer for single pieces either: `--skills <one skill>` or
`include: ["capability:security"]` expands to the skill's whole module, about sixty files for the security
skill alone (measured on 2026-10-26). A project **vendors single files** from a pinned ECC checkout and
records where they came from:

```bash
# once per machine: a pinned, read-only checkout
git clone --depth 1 --branch v2.2.3 https://github.com/affaan-m/ECC.git <ECC checkout>   # e.g. a sibling of the template repository

# a skill: the whole folder; an agent: the one file (from the project root)
<Harness CLI> vendor --from <ECC checkout> skills/security-review agents/security-reviewer.md
```

`vendor` copies `skills/<name>/` to `.claude/skills/<name>/` and `agents/<name>.md` to
`.claude/agents/<name>.md`, and records the source, its version and a hash per file under `vendored` in
`docs/harness/manifest.json`, so the weekly review can list them and `check` can report local edits. Read
the file before vendoring: ECC agents carry a "Prompt Defense Baseline" block and some assume ECC's own
scripts; delete what does not apply and say so in `review-log.md`. Pieces worth considering, by need:

| Need in the project | ECC piece | Notes |
|---|---|---|
| Auth, payments, user data, file uploads | `skills/security-review`; `agents/security-reviewer.md` (read-only) | the skill is long (500 lines); load it only from a dispatch that needs it |
| A web UI with user flows | `skills/e2e-testing`; `agents/e2e-runner.md`; `skills/browser-qa` | Playwright-based |
| Postgres or Supabase | `agents/database-reviewer.md` (read-only); `skills/postgres-patterns` | pairs with the project's own hard-area rule |
| A TypeScript, React, Python… codebase | `agents/typescript-reviewer.md`, `agents/react-reviewer.md`, …; single files from `rules/<language>/` as path-scoped rules | add `paths:` frontmatter to a vendored rule |
| Red builds eating builder rounds | `agents/build-error-resolver.md` (can edit; minimal diffs only) | dispatched like a builder, with a ledger row |
| Token accounting beyond the usage log | `skills/cost-tracking` with ECC's `stop:cost-tracker` hook | the hook needs ECC's `hooks-runtime` module: `ecc-install.json` with `"modules": ["hooks-runtime"]`, profile `minimal`, `ECC_DISABLED_HOOKS` for the rest; replaces `.claude/hooks/usage-log.mjs` |
| A deterministic repo scorecard | `scripts/harness-audit.js` run from the ECC checkout | ECC-centric checks; read them before trusting the score |
| Learning from sessions automatically | `skills/continuous-learning-v2` (instincts via hooks) | heavy; the ledger and `lessons.md` are the explicit, lighter version |

`ecc-install.json` stays in the project for the one case where a module is wanted whole (the hooks
runtime); apply it with `npx ecc-universal@2.2.3 install --config ecc-install.json --dry-run`, then without
`--dry-run`, and record it in `review-log.md`. Rules then land under `.claude/rules/ecc/`, skills flat under
`.claude/skills/`.

Not recommended: ECC's `rules/common` pack as a whole. It mandates TDD and 80 % coverage for every change,
which contradicts proportionate verification (`verification.md`); vendor single files from it if a line is
wanted. An ECC reviewer agent complements, never replaces, the `reviewer` role's verdict.

## Plugins and MCP servers

- Enable a plugin per project in `.claude/settings.json` → `enabledPlugins`, not at user level, unless it is
  wanted in every project. `claude plugin details <name>` shows a plugin's always-on token cost.
- Keep enabled MCP servers under about ten and prefer a CLI when one exists (`gh` over a GitHub server,
  `supabase` over a database server) for one-shot actions. `/context` shows what each costs.
- Codex: `.codex/config.toml` lists MCP servers per project; the same restraint.

## When a need comes up

1. Write it down: what recurred, how often, what it cost (rounds, time, a missed defect).
2. Pick the smallest surface from the first table.
3. Prefer, in order: a check the project already can run; a line in a tier; a path-scoped rule; a skill or
   agent from this template; an ECC piece; a plugin; an MCP server.
4. Record it in `review-log.md` with a `review-by` a month out. The weekly review asks whether it was used.
