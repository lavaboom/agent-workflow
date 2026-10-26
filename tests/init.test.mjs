// `init` end to end against this repository's template/: a v1 project, a Codex-only project, an empty one.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { contentHash } from '../src/hash.mjs';
import { REPO_DIR, nativeIn, pathExists, readJson, readText, removeTempDirs, runCli, toCrlf } from './helpers/setup.mjs';
import { V1_FILES, makeV1Project, snapshot } from './helpers/v1-project.mjs';

const TEMPLATE = path.join(REPO_DIR, 'template');
const PACK = await readJson(path.join(TEMPLATE, 'template.json'));
const GIT_ADD = 'git add -A -- AGENTS.md .claude .agents .codex docs ecc-install.json fresh-init.cmd .gitignore';

after(removeTempDirs);

function tableRow(text, name) {
  return text.split(/\r?\n/).find((line) => line.startsWith(`| ${name} |`));
}

describe('init on a v1 project', () => {
  for (const eol of ['lf', 'crlf']) {
    it(`deletes the v1 files, moves the entry file, fills the settings, adopts (${eol})`, async () => {
      const project = await makeV1Project({ eol });
      const run = await runCli(['init', '--project', project]);
      assert.equal(run.code, 0, run.stdout + run.stderr);
      for (const gone of ['CLAUDE.md', 'docs/AGENT_PROTOCOL.md', '.claude/agents/opus-high.md', '.gitignore.harness']) {
        assert.equal(await pathExists(nativeIn(project, gone)), false, gone);
      }
      for (const line of ['deleted     CLAUDE.md', 'deleted     docs/AGENT_PROTOCOL.md', 'deleted     docs/tasks/README.md',
        'deleted     .claude/agents/opus-high.md', 'deleted     .claude/agents/', 'deleted     .claude/skills/manager/SKILL.md',
        'deleted     .claude/skills/manager/', 'moved       AGENTS.md', 'replaced    .codex/config.toml', 'kept        docs/ROADMAP.md']) {
        assert.ok(`\n${run.stdout}`.includes(`\n${line}  (`), line);
      }
      // Kept: the project's own skill and files; the roadmap byte for byte.
      assert.equal(await readText(project, '.claude', 'skills', 'own-skill', 'SKILL.md'), expectedFiles(eol)['.claude/skills/own-skill/SKILL.md']);
      assert.equal(await readText(project, 'docs', 'ROADMAP.md'), expectedFiles(eol)['docs/ROADMAP.md']);
      assert.ok(await pathExists(nativeIn(project, '.claude/launch.json')));
      // Replaced from the template: the v1 copies and pointer files.
      for (const p of ['.claude/skills/manager/SKILL.md', 'docs/tasks/README.md', '.codex/config.toml']) {
        assert.ok((await readFile(nativeIn(project, p))).equals(await readFile(nativeIn(TEMPLATE, p))), p);
      }
      assert.equal(await readText(project, 'docs', 'harness', 'init-backup', '.codex', 'config.toml'), expectedFiles(eol)['.codex/config.toml']);

      const guide = await readText(project, 'docs', 'project-guide.md');
      assert.match(guide, /^<!-- Moved from AGENTS\.md by agent-workflow init on 2026-10-26\./);
      assert.doesNotMatch(guide, /This project follows the shared workflow/);
      assert.match(guide, /This file guides every coding agent on what Demo is/);
      assert.match(guide, /## Deploy \(another example table\)/);
      assert.equal(guide.includes('\r\n'), eol === 'crlf');

      const agents = await readText(project, 'AGENTS.md');
      assert.equal(agents.split('\n')[0], '# Demo');
      assert.equal(tableRow(agents, 'Gate'), '| Gate | `npm run test:local` |');
      assert.equal(tableRow(agents, 'Merge'), '| Merge | `npm run merge:batch -- <branch> [<branch> …]` |');
      assert.equal(tableRow(agents, 'Hard areas'), '| Hard areas | money math, RLS or migration design |');
      assert.equal(tableRow(agents, 'Who pushes'), '| Who pushes | (owner, 2026-10-22) only the owner; a push deploys staging |');
      assert.equal(tableRow(agents, 'Capacity'), tableRow(await readText(TEMPLATE, 'AGENTS.md'), 'Capacity'));
      assert.match(tableRow(agents, 'Harness CLI'), /`node .*bin\/agent-workflow\.mjs`/);
      assert.match(agents, /\| `e2e` \| [^\n]*\|\n<!-- v1 Builder checks: `npm test`; `npm run lint`; `npm run typecheck` ; split these into the tier rows above -->\n/);
      assert.doesNotMatch(agents, /port 5432|deploy merge|CI only|Local services|\{\{/);
      assert.match(run.stdout, /^filled {6}AGENTS\.md {2}\(9 settings from the old Workflow settings table\)$/m);
      assert.match(run.stdout, /^ {14}not carried over \(no v2 row; still in docs\/project-guide\.md\): Custom knob$/m);

      const board = await readText(project, 'docs', 'manager', 'board.md');
      const nl = eol === 'crlf' ? '\r\n' : '\n';
      assert.ok(board.startsWith(`# Manager board${nl}${nl}\`\`\`${nl}Next step: <fill in>${nl}Current issues: <fill in>${nl}\`\`\`${nl}${nl}The manager`), board);
      const gitignore = await readText(project, '.gitignore');
      assert.equal(gitignore.split(/\r?\n/).filter((line) => line === '.claude/worktrees/').length, 1);
      assert.match(gitignore, /\.claude\/settings\.local\.json/);

      const manifest = await readJson(nativeIn(project, 'docs/harness/manifest.json'));
      assert.equal(manifest.templateVersion, PACK.version);
      assert.equal(manifest.projectName, 'Demo');
      assert.deepEqual(Object.keys(manifest.files), PACK.files.map((entry) => entry.path));
      for (const entry of PACK.files.filter((file) => file.path !== '.gitignore.harness')) {
        assert.equal(manifest.files[entry.path].sha256, contentHash(await readFile(nativeIn(project, entry.path))), entry.path);
      }
      assert.ok(run.stdout.includes(`\n  ${GIT_ADD} CLAUDE.md docs/AGENT_PROTOCOL.md && git commit -m "docs(harness): adopt agent-workflow v${PACK.version}"\n`), run.stdout);
      assert.match(run.stdout, /\n {2}0\. docs\/project-guide\.md holds the old AGENTS\.md: split its rules into \.claude\/rules\/ and docs\/, then trim it\n {2}1\. /);

      const check = await runCli(['check', '--project', project]);
      assert.equal(check.code, 0, check.stdout);
      assert.match(check.stdout, /project checks: \d+ ok, 0 warn, 0 fail/);

      const before = await snapshot(project);
      const again = await runCli(['init', '--project', project]);
      assert.equal(again.code, 0, again.stderr);
      assert.match(again.stdout, new RegExp(`^template ${PACK.version} → ${PACK.version}$`, 'm'));
      assert.doesNotMatch(again.stdout, /^(?!unchanged|skip|write|template )\S/m, again.stdout);
      assert.doesNotMatch(again.stdout, /git add/);
      const afterAgain = await snapshot(project);
      delete before['docs/harness/manifest.json'];
      delete afterAgain['docs/harness/manifest.json'];
      assert.deepEqual(afterAgain, before);
    });
  }

  it('--dry-run writes nothing and lists every deletion, move, replacement and setting', async () => {
    const project = await makeV1Project();
    const before = await snapshot(project);
    const run = await runCli(['init', '--project', project, '--dry-run']);
    assert.equal(run.code, 0, run.stderr);
    assert.deepEqual(await snapshot(project), before);
    assert.match(run.stdout, /^dry run: nothing written$/m);
    for (const text of ['deleted     CLAUDE.md', 'deleted     .claude/agents/opus-high.md', 'moved       AGENTS.md  (to docs/project-guide.md',
      'replaced    .codex/config.toml', 'backup      docs/harness/init-backup/.codex/config.toml', 'Gate = `npm run test:local`',
      'Who pushes = (owner, 2026-10-22) only the owner', 'inserted "Next step:" and "Current issues:"', 'update      .gitignore']) {
      assert.ok(run.stdout.includes(text), text);
    }
    const json = JSON.parse((await runCli(['init', '--project', project, '--dry-run', '--json'])).stdout);
    assert.equal(json.mode, 'adopt');
    assert.equal(json.dryRun, true);
    assert.ok(json.settings.some((setting) => setting.name === 'Merge'));
    assert.ok(json.items.every((item) => !('bytes' in item)));
    assert.equal(json.projectName, 'Demo');
    const named = JSON.parse((await runCli(['init', '--project', project, '--dry-run', '--json', '--name', 'Other'])).stdout);
    assert.equal(named.projectName, 'Other');
    assert.deepEqual(await snapshot(project), before);
  });
});

function expectedFiles(eol) {
  return Object.fromEntries(Object.entries(V1_FILES).map(([p, text]) => [p, eol === 'crlf' ? toCrlf(text) : text]));
}
