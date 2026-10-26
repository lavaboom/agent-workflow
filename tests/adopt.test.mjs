import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { harnessCliCommand } from '../src/cli.mjs';
import { contentHash } from '../src/hash.mjs';
import {
  BIN, FIXTURE_TEMPLATE, copyFixtureTemplate, makeProject, pathExists, nativeIn, readJson, readText, removeTempDirs, runCli, toCrlf, toLf, writeText,
} from './helpers/setup.mjs';

const PACK = (await readJson(nativeIn(FIXTURE_TEMPLATE, 'template.json'))).files;
const MANIFEST = 'docs/harness/manifest.json';

after(removeTempDirs);

describe('adopt', () => {
  it('creates every pack file, writes the manifest, substitutes owned placeholders only', async () => {
    const template = await copyFixtureTemplate();
    const readme = nativeIn(template, 'docs/harness/README.md');
    await writeText(readme, `${await readFile(readme, 'utf8')}Literal {{PROJECT}} stays in managed files.\n`);
    const project = await makeProject('demo-project');
    const run = await runCli(['adopt', '--project', project, '--template', template]);
    assert.equal(run.code, 0, run.stderr);
    for (const entry of PACK) assert.ok(await pathExists(nativeIn(project, entry.path)), entry.path);
    const manifest = await readJson(nativeIn(project, MANIFEST));
    assert.equal(manifest.templateVersion, '2.1.0');
    assert.equal(manifest.projectName, 'demo-project');
    assert.equal(manifest.adoptedAt, '2026-10-26T12:00:00Z');
    assert.equal(manifest.syncedAt, '2026-10-26T12:00:00Z');
    assert.deepEqual(Object.keys(manifest.files), PACK.map((entry) => entry.path));
    for (const entry of PACK) {
      const bytes = await readFile(nativeIn(project, entry.path));
      assert.equal(manifest.files[entry.path].sha256, contentHash(bytes), entry.path);
      assert.equal(manifest.files[entry.path].policy, entry.policy);
    }
    const agents = await readText(project, 'AGENTS.md');
    assert.match(agents, /^# demo-project$/m);
    assert.match(agents, /Adopted on 2026-10-26 /);
    assert.ok(agents.includes(`\`node ${BIN.split(path.sep).join('/')} check\``), agents);
    assert.doesNotMatch(agents, /\{\{/);
    assert.match(await readText(project, 'docs', 'harness', 'README.md'), /Literal \{\{PROJECT\}\} stays/);
    assert.match(run.stdout, /^create {6}AGENTS\.md$/m);
    assert.match(run.stdout, /^write {7}docs\/harness\/manifest\.json/m);
    assert.match(run.stdout, /Next steps for this fixture:\n1\. Fill in AGENTS\.md\./);
  });

  it('writes a from entry with its source bytes and records it under its own path', async () => {
    const project = await makeProject();
    assert.equal((await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE])).code, 0);
    const source = await readFile(nativeIn(FIXTURE_TEMPLATE, '.claude/skills/manager/SKILL.md'));
    const mirror = await readFile(nativeIn(project, '.agents/skills/manager/SKILL.md'));
    assert.ok(mirror.equals(source));
    const manifest = await readJson(nativeIn(project, MANIFEST));
    assert.deepEqual(manifest.files['.agents/skills/manager/SKILL.md'], { policy: 'managed', sha256: contentHash(source) });
  });

  it('refuses a second adopt', async () => {
    const project = await makeProject();
    await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE]);
    const again = await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE]);
    assert.equal(again.code, 1);
    assert.match(again.stderr, /already adopted; use sync/);
  });

  it('honours --name', async () => {
    const project = await makeProject();
    await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE, '--name', 'Orchard Demo']);
    assert.match(await readText(project, 'AGENTS.md'), /^# Orchard Demo$/m);
  });

  it('refuses on a conflicting AGENTS.md and writes nothing', async () => {
    const project = await makeProject();
    await writeText(nativeIn(project, 'AGENTS.md'), '# Mine\n');
    const run = await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE]);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^conflict {4}AGENTS\.md/m);
    assert.match(run.stderr, /1 conflict\(s\); nothing written/);
    assert.equal(await pathExists(nativeIn(project, MANIFEST)), false);
    assert.equal(await pathExists(nativeIn(project, '.claude/rules/core.md')), false);
  });

  it('keeps a conflicting owned file with --force-owned and records its hash', async () => {
    const project = await makeProject();
    await writeText(nativeIn(project, 'AGENTS.md'), '# Mine\n');
    const run = await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE, '--force-owned']);
    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /^kept {8}AGENTS\.md/m);
    assert.equal(await readText(project, 'AGENTS.md'), '# Mine\n');
    const manifest = await readJson(nativeIn(project, MANIFEST));
    assert.equal(manifest.files['AGENTS.md'].sha256, contentHash(Buffer.from('# Mine\n')));
  });

  it('--force-owned does not cover a managed conflict; --force-managed overwrites it', async () => {
    const project = await makeProject();
    await writeText(nativeIn(project, '.claude/rules/core.md'), 'local\n');
    const refused = await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE, '--force-owned']);
    assert.equal(refused.code, 1);
    const run = await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE, '--force-managed']);
    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /^overwritten .claude\/rules\/core\.md/m);
    assert.equal(await readText(project, '.claude', 'rules', 'core.md'), await readText(FIXTURE_TEMPLATE, '.claude', 'rules', 'core.md'));
  });

  it('skips a file that is already identical, with CRLF or with LF line endings', async () => {
    const core = await readText(FIXTURE_TEMPLATE, '.claude', 'rules', 'core.md');
    for (const convert of [toCrlf, toLf]) {
      const project = await makeProject();
      await writeText(nativeIn(project, '.claude/rules/core.md'), convert(core));
      const run = await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE]);
      assert.equal(run.code, 0, run.stderr);
      assert.match(run.stdout, /^skip {8}.claude\/rules\/core\.md$/m);
    }
  });

  it('--dry-run plans without writing', async () => {
    const project = await makeProject();
    const run = await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE, '--dry-run']);
    assert.equal(run.code, 0);
    assert.match(run.stdout, /^dry run: nothing written$/m);
    assert.match(run.stdout, /^create {6}AGENTS\.md$/m);
    assert.equal(await pathExists(nativeIn(project, 'AGENTS.md')), false);
    assert.equal(await pathExists(nativeIn(project, MANIFEST)), false);
  });

  it('--json prints one object without file bytes', async () => {
    const project = await makeProject();
    const run = await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE, '--json']);
    const result = JSON.parse(run.stdout);
    assert.equal(result.ok, true);
    assert.equal(result.version, '2.1.0');
    assert.equal(result.items.length, PACK.length);
    assert.deepEqual(Object.keys(result.items[0]).sort(), ['action', 'path', 'policy', 'sha256']);
    assert.match(result.nextSteps, /Next steps/);
  });

  it('refuses when a listed template file is missing', async () => {
    const template = await copyFixtureTemplate();
    const pack = await readJson(nativeIn(template, 'template.json'));
    pack.files.push({ path: 'docs/missing.md', policy: 'managed' });
    await writeText(nativeIn(template, 'template.json'), JSON.stringify(pack));
    const project = await makeProject();
    const run = await runCli(['adopt', '--project', project, '--template', template]);
    assert.equal(run.code, 1);
    assert.match(run.stderr, /template file missing: docs\/missing\.md/);
    assert.equal(await pathExists(nativeIn(project, MANIFEST)), false);
  });
});

describe('harnessCliCommand', () => {
  it('uses forward slashes and quotes a path with whitespace', () => {
    const plain = path.join(path.parse(process.cwd()).root, 'code', 'agent-workflow', 'bin', 'agent-workflow.mjs');
    assert.equal(harnessCliCommand(plain), `node ${plain.split(path.sep).join('/')}`);
    assert.doesNotMatch(harnessCliCommand(plain), /\\/);
    const spaced = path.join(path.parse(process.cwd()).root, 'Program Files', 'aw', 'bin', 'agent-workflow.mjs');
    assert.equal(harnessCliCommand(spaced), `node "${spaced.split(path.sep).join('/')}"`);
  });
});
