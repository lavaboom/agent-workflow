// adopt, sync and check give the same outcomes whatever line endings the template and the project use
// (cli-spec §8). The fixture is converted explicitly, so this holds in an LF checkout and in a CRLF one.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, describe, it } from 'node:test';
import {
  convertLineEndings, copyFixtureTemplateWith, makeProject, nativeIn, readJson, removeTempDirs, runCli, writeText,
} from './helpers/setup.mjs';

after(removeTempDirs);

const OTHER = { lf: 'crlf', crlf: 'lf' };
const PACK_PATHS = [
  'AGENTS.md', '.claude/rules/core.md', '.claude/rules/tasks.md', '.claude/skills/manager/SKILL.md',
  '.agents/skills/manager/SKILL.md', 'docs/harness/README.md', 'docs/harness/building.md',
  'docs/harness/ledger.md', 'docs/harness/review-log.md', 'docs/manager/board.md',
];
const MANAGED = PACK_PATHS.filter((p) => !['AGENTS.md', 'docs/harness/ledger.md', 'docs/harness/review-log.md', 'docs/manager/board.md'].includes(p));

function assertNoProblems(run) {
  assert.equal(run.code, 0, run.stdout + run.stderr);
  assert.doesNotMatch(run.stdout, /^(warn|fail|conflict|update) /m, run.stdout);
}

for (const eol of ['lf', 'crlf']) {
  describe(`a template with ${eol.toUpperCase()} line endings`, () => {
    it('passes the template checks', async () => {
      const template = await copyFixtureTemplateWith(eol);
      assertNoProblems(await runCli(['check', '--template-only', '--template', template]));
    });

    it('adopts, checks and syncs cleanly, also after the project switches line endings', async () => {
      const template = await copyFixtureTemplateWith(eol);
      const project = await makeProject();
      const adopt = await runCli(['adopt', '--project', project, '--template', template]);
      assert.equal(adopt.code, 0, adopt.stderr);
      assert.doesNotMatch(adopt.stdout, /\r/);
      assert.match(adopt.stdout, /\n\nNext steps for this fixture:\n1\. Fill in AGENTS\.md\.\n2\. Run agent-workflow check\.\n$/);
      for (const p of PACK_PATHS) assert.match(adopt.stdout, new RegExp(`^create {6}${p.replace(/\./g, '\\.')}$`, 'm'));
      const core = await readFile(nativeIn(project, '.claude/rules/core.md'));
      assert.ok(core.equals(await readFile(nativeIn(template, '.claude/rules/core.md'))), 'bytes are copied unchanged');

      assertNoProblems(await runCli(['check', '--project', project, '--template', template]));
      const sync = await runCli(['sync', '--project', project, '--template', template]);
      assertNoProblems(sync);
      for (const p of MANAGED) assert.match(sync.stdout, new RegExp(`^unchanged {3}${p.replace(/\./g, '\\.')}$`, 'm'));

      await convertLineEndings(nativeIn(project, '.claude'), OTHER[eol]);
      await convertLineEndings(nativeIn(project, '.agents'), OTHER[eol]);
      await convertLineEndings(nativeIn(project, 'docs'), OTHER[eol]);
      assertNoProblems(await runCli(['check', '--project', project, '--template', template]));
      assertNoProblems(await runCli(['sync', '--project', project, '--template', template]));
    });

    it('skips pre-existing identical files that use the other line endings', async () => {
      const template = await copyFixtureTemplateWith(eol);
      const project = await makeProject();
      for (const p of MANAGED) {
        await writeText(nativeIn(project, p), await readFile(nativeIn(template, p.startsWith('.agents/') ? '.claude/skills/manager/SKILL.md' : p), 'utf8'));
      }
      await convertLineEndings(project, OTHER[eol]);
      const run = await runCli(['adopt', '--project', project, '--template', template]);
      assert.equal(run.code, 0, run.stderr);
      for (const p of MANAGED) assert.match(run.stdout, new RegExp(`^skip {8}${p.replace(/\./g, '\\.')}$`, 'm'));
    });

    it('still updates a managed file the template changed', async () => {
      const template = await copyFixtureTemplateWith(eol);
      const project = await makeProject();
      assert.equal((await runCli(['adopt', '--project', project, '--template', template])).code, 0);
      const building = nativeIn(template, 'docs/harness/building.md');
      await writeText(building, `${await readFile(building, 'utf8')}${eol === 'crlf' ? 'One more line.\r\n' : 'One more line.\n'}`);
      const run = await runCli(['sync', '--project', project, '--template', template]);
      assert.equal(run.code, 0, run.stderr);
      assert.match(run.stdout, /^update {6}docs\/harness\/building\.md$/m);
      const manifest = await readJson(nativeIn(project, 'docs/harness/manifest.json'));
      assert.equal(Object.keys(manifest.files).length, PACK_PATHS.length);
    });
  });
}
