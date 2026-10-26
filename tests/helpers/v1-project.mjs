// Fixture projects for `init`, written by code rather than kept under tests/fixtures: an AGENTS.md or a
// CLAUDE.md there would be read as instructions by agents working in this repository.
import { mkdir, readFile, readdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import { makeProject, nativeIn, toCrlf, writeText } from './setup.mjs';

// The v1 entry file: a title, the pointer paragraph, a second preamble paragraph, the settings table with
// v1 names (backticks, parentheses, an escaped pipe), then project sections holding two tables of their
// own that must not be read as settings (one of them with a "Gate" row).
export const V1_AGENTS = `# AGENTS.md

This project follows the shared workflow: read \`C:/code/agent-workflow/WORKFLOW.md\` first. It links
\`C:/code/agent-workflow/AGENT_PROTOCOL.md\` (the task flow) and, for Claude, \`C:/code/agent-workflow/claude/\`.

This file guides every coding agent on what Demo is, and gives the shared rules their values in
"Workflow settings" below.

## Ports (example table, not settings)

| Setting | Value |
|---|---|
| Gate | port 5432, not a command |
| Project | not-this-name |

## Workflow settings

The values the shared rules name; the only place projects differ.

| Setting | Value |
|---|---|
| Project | \`Demo\` |
| Main checkout | \`C:\\code\\Demo\` |
| Worktrees | \`../Demo-worktrees/task-NNN-<slug>/\` |
| Branch database (a task with a migration) | \`npm run db:branch -- start\`, cleaned with \`-- prune\` |
| Gate | \`npm run test:local\` |
| Merge | \`npm run merge:batch -- <branch> [<branch> …]\` |
| Gate log | \`npm run gate:log \\| tail\` |
| Capacity | <the command that answers dispatch / dispatch-without-stack / wait> |
| Builder checks | \`npm test\`; \`npm run lint\`; \`npm run typecheck\` |
| Hard areas (\`opus-xhigh\`) | money math, RLS or migration design |
| Local services | \`docs/local-services.md\` |
| Who pushes (owner, 2026-10-22) | only the owner; a push deploys staging |
| Custom knob | 42 |
| Workflow overrides | (none) |

## Project overview

Demo tracks household costs.

## Deploy (another example table)

| Setting | Value |
|---|---|
| Merge | the deploy merge, not a setting |
| Who pushes | CI only |
`;

export const V1_CLAUDE_MD = '@~/.agent-workflow/WORKFLOW.md\n@~/.agent-workflow/claude/CLAUDE.md\n@AGENTS.md\n';

export const V1_BOARD = `# Manager board

The manager tab's memory (\`~/.claude/skills/manager/SKILL.md\`). A fresh tab reads it first.

\`\`\`
Autopilot: off
Remote control: off
Last tab stopped at: (none yet)
\`\`\`

## Now

Feature: none.
`;

export const V1_FILES = {
  'CLAUDE.md': V1_CLAUDE_MD,
  'AGENTS.md': V1_AGENTS,
  'docs/AGENT_PROTOCOL.md': '# Agent Protocol\n\nMoved: the protocol lives in `C:/code/agent-workflow/AGENT_PROTOCOL.md`.\n',
  'docs/tasks/README.md': '# Tasks\n\nShared, in `C:/code/agent-workflow/TASKS.md`.\n',
  'docs/manager/board.md': V1_BOARD,
  'docs/ROADMAP.md': '# Roadmap\n\nThe project\'s own roadmap.\n',
  '.codex/config.toml': '[features]\nmulti_agent = true\n',
  '.claude/agents/opus-high.md': '---\nname: opus-high\n---\nv1 agent\n',
  '.claude/skills/manager/SKILL.md': '---\nname: manager\n---\nv1 manager skill\n',
  '.claude/skills/own-skill/SKILL.md': '---\nname: own-skill\n---\nthe project\'s own skill\n',
  '.claude/launch.json': '{ "version": "0.0.1" }\n',
  '.gitignore': 'node_modules/\n.claude/worktrees/\n',
};

// eol: 'lf' or 'crlf' for every file written.
export async function makeV1Project({ name = 'demo', eol = 'lf', files = V1_FILES } = {}) {
  const project = await makeProject(name);
  for (const [posixPath, text] of Object.entries(files)) {
    await writeText(nativeIn(project, posixPath), eol === 'crlf' ? toCrlf(text) : text);
  }
  return project;
}

// A junction (Windows) or a directory symlink (elsewhere) at linkPath pointing at targetDir.
export async function makeDirectoryLink(targetDir, linkPath) {
  await mkdir(targetDir, { recursive: true });
  await mkdir(path.dirname(linkPath), { recursive: true });
  await symlink(targetDir, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
}

// Every entry under dir as { posixPath: Buffer } (a link: 'link', not followed), to compare trees.
export async function snapshot(dir, prefix = '') {
  const files = {};
  for (const entry of await readdir(path.join(dir, ...prefix.split('/').filter(Boolean)), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(files, await snapshot(dir, relative));
    else files[relative] = entry.isFile() ? await readFile(nativeIn(dir, relative)) : 'link';
  }
  return files;
}
