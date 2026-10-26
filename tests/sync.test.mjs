import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { harnessCliCommand } from '../src/cli.mjs';
import { contentHash } from '../src/hash.mjs';
import { decideManaged } from '../src/sync-decide.mjs';
import {
  BIN, copyFixtureTemplate, makeProject, nativeIn, pathExists, readJson, readText, removeTempDirs, runCli, writeText,
} from './helpers/setup.mjs';

const MANIFEST = 'docs/harness/manifest.json';
const CORE = '.claude/rules/core.md';
const LATER = new Date('2026-10-27T09:30:00Z');

after(removeTempDirs);

async function adoptedProject() {
  const template = await copyFixtureTemplate();
  const project = await makeProject();
  const run = await runCli(['adopt', '--project', project, '--template', template]);
  assert.equal(run.code, 0, run.stderr);
  return { template, project };
}

async function sync(env, ...flags) {
  return runCli(['sync', '--project', env.project, '--template', env.template, ...flags], { now: LATER });
}

async function editTemplate(template, posixPath, text) {
  await writeText(nativeIn(template, posixPath), text);
}

async function setPack(template, change) {
  const file = nativeIn(template, 'template.json');
  const pack = await readJson(file);
  change(pack);
  await writeText(file, JSON.stringify(pack, null, 2));
}

describe('sync', () => {
  it('refuses when the project is not adopted', async () => {
    const template = await copyFixtureTemplate();
    const project = await makeProject();
    const run = await runCli(['sync', '--project', project, '--template', template]);
    assert.equal(run.code, 1);
    assert.match(run.stderr, /not adopted; use adopt/);
  });

  it('reports unchanged files and records syncedAt', async () => {
    const env = await adoptedProject();
    const run = await sync(env);
    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /^unchanged {3}\.claude\/rules\/core\.md$/m);
    assert.match(run.stdout, /^skip {8}AGENTS\.md {2}\(owned by the project\)$/m);
    const manifest = await readJson(nativeIn(env.project, MANIFEST));
    assert.equal(manifest.syncedAt, '2026-10-27T09:30:00Z');
    assert.equal(manifest.adoptedAt, '2026-10-26T12:00:00Z');
  });

  it('updates an unmodified managed file after a template change, mirrors included', async () => {
    const env = await adoptedProject();
    await editTemplate(env.template, CORE, '<!-- source: x\napplies: y\nreview-by: 2999-01-01 -->\n# Core v2\n');
    await editTemplate(env.template, '.claude/skills/manager/SKILL.md', '# Manager v2\n');
    await setPack(env.template, (pack) => { pack.version = '2.2.0'; });
    const run = await sync(env);
    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /^template 2\.1\.0 → 2\.2\.0$/m);
    assert.match(run.stdout, /^update {6}\.claude\/rules\/core\.md$/m);
    assert.match(run.stdout, /^update {6}\.agents\/skills\/manager\/SKILL\.md$/m);
    assert.match(await readText(env.project, '.claude', 'rules', 'core.md'), /# Core v2/);
    assert.equal(await readText(env.project, '.agents', 'skills', 'manager', 'SKILL.md'), '# Manager v2\n');
    const manifest = await readJson(nativeIn(env.project, MANIFEST));
    assert.equal(manifest.templateVersion, '2.2.0');
    assert.equal(manifest.files[CORE].sha256, contentHash(Buffer.from(await readText(env.project, '.claude', 'rules', 'core.md'))));
  });

  it('reports a conflict on a local edit plus a template change and writes nothing to that file', async () => {
    const env = await adoptedProject();
    await writeText(nativeIn(env.project, CORE), 'my local edit\n');
    await editTemplate(env.template, CORE, 'template v2\n');
    const run = await sync(env);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^conflict {4}\.claude\/rules\/core\.md {2}\(local copy edited since last sync; template changed since last sync\)$/m);
    assert.match(run.stderr, /1 conflict\(s\) left unresolved/);
    assert.equal(await readText(env.project, '.claude', 'rules', 'core.md'), 'my local edit\n');
  });

  it('--take-template overwrites the conflict', async () => {
    const env = await adoptedProject();
    await writeText(nativeIn(env.project, CORE), 'my local edit\n');
    await editTemplate(env.template, CORE, 'template v2\n');
    const run = await sync(env, '--take-template');
    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /^overwritten \.claude\/rules\/core\.md/m);
    assert.equal(await readText(env.project, '.claude', 'rules', 'core.md'), 'template v2\n');
    const manifest = await readJson(nativeIn(env.project, MANIFEST));
    assert.deepEqual(manifest.files[CORE], { policy: 'managed', sha256: contentHash(Buffer.from('template v2\n')) });
  });

  it('--keep-local records the local hash and stays kept until the template changes again', async () => {
    const env = await adoptedProject();
    await writeText(nativeIn(env.project, CORE), 'my local edit\n');
    await editTemplate(env.template, CORE, 'template v2\n');
    const kept = await sync(env, '--keep-local');
    assert.equal(kept.code, 0, kept.stderr);
    assert.match(kept.stdout, /^kept {8}\.claude\/rules\/core\.md/m);
    const manifest = await readJson(nativeIn(env.project, MANIFEST));
    assert.equal(manifest.files[CORE].sha256, contentHash(Buffer.from('my local edit\n')));
    assert.equal(manifest.files[CORE].templateSha256, contentHash(Buffer.from('template v2\n')));
    const again = await sync(env);
    assert.equal(again.code, 0, again.stderr);
    assert.match(again.stdout, /^kept {8}\.claude\/rules\/core\.md {2}\(local version kept earlier; template unchanged\)$/m);
    assert.equal(await readText(env.project, '.claude', 'rules', 'core.md'), 'my local edit\n');
    await editTemplate(env.template, CORE, 'template v3\n');
    const third = await sync(env);
    assert.equal(third.code, 1);
    assert.match(third.stdout, /^conflict {4}\.claude\/rules\/core\.md {2}\(local version kept earlier; template changed since last sync\)$/m);
  });

  it('treats a local edit with no template change as a conflict', async () => {
    const env = await adoptedProject();
    await writeText(nativeIn(env.project, CORE), 'my local edit\n');
    const run = await sync(env);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /conflict {4}\.claude\/rules\/core\.md {2}\(local copy edited since last sync; template unchanged since last sync\)/);
  });

  it('reports a retired file and prunes it only when unmodified', async () => {
    const env = await adoptedProject();
    const building = 'docs/harness/building.md';
    await setPack(env.template, (pack) => { pack.files = pack.files.filter((entry) => entry.path !== building); });
    const reported = await sync(env);
    assert.equal(reported.code, 0, reported.stderr);
    assert.match(reported.stdout, /^retired {5}docs\/harness\/building\.md {2}\(no longer in the template; left in place/m);
    assert.ok(await pathExists(nativeIn(env.project, building)));
    assert.ok((await readJson(nativeIn(env.project, MANIFEST))).files[building]);

    await writeText(nativeIn(env.project, building), 'edited\n');
    const modified = await sync(env, '--prune');
    assert.match(modified.stdout, /^retired {5}docs\/harness\/building\.md {2}\(modified locally; not pruned\)$/m);
    assert.ok(await pathExists(nativeIn(env.project, building)));

    const original = await readFile(nativeIn((await copyFixtureTemplate()), building));
    await writeText(nativeIn(env.project, building), original.toString('utf8'));
    const pruned = await sync(env, '--prune');
    assert.equal(pruned.code, 0, pruned.stderr);
    assert.match(pruned.stdout, /^pruned {6}docs\/harness\/building\.md/m);
    assert.equal(await pathExists(nativeIn(env.project, building)), false);
    assert.equal((await readJson(nativeIn(env.project, MANIFEST))).files[building], undefined);
  });

  it('creates a new owned file and never writes an existing one', async () => {
    const env = await adoptedProject();
    await editTemplate(env.template, 'docs/ROADMAP.md', '# Roadmap for {{PROJECT}}\nRun {{HARNESS_CLI}} ledger.\n');
    await setPack(env.template, (pack) => { pack.files.push({ path: 'docs/ROADMAP.md', policy: 'owned' }); });
    await editTemplate(env.template, 'AGENTS.md', '# changed upstream\n');
    await writeText(nativeIn(env.project, 'AGENTS.md'), '# project text\n');
    const run = await sync(env);
    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /^create {6}docs\/ROADMAP\.md$/m);
    assert.equal(await readText(env.project, 'docs', 'ROADMAP.md'), `# Roadmap for demo-project\nRun ${harnessCliCommand(BIN)} ledger.\n`);
    assert.equal(await readText(env.project, 'AGENTS.md'), '# project text\n');
  });

  it('recreates a deleted managed file', async () => {
    const env = await adoptedProject();
    await rm(nativeIn(env.project, CORE));
    const run = await sync(env);
    assert.match(run.stdout, /^create {6}\.claude\/rules\/core\.md$/m);
    assert.ok(await pathExists(nativeIn(env.project, CORE)));
  });

  it('--dry-run changes nothing', async () => {
    const env = await adoptedProject();
    const before = await readText(env.project, 'docs', 'harness', 'manifest.json');
    await editTemplate(env.template, CORE, 'template v2\n');
    const run = await sync(env, '--dry-run');
    assert.equal(run.code, 0);
    assert.match(run.stdout, /^dry run: nothing written$/m);
    assert.match(run.stdout, /^update {6}\.claude\/rules\/core\.md$/m);
    assert.notEqual(await readText(env.project, '.claude', 'rules', 'core.md'), 'template v2\n');
    assert.equal(await readText(env.project, 'docs', 'harness', 'manifest.json'), before);
  });

  it('--json reports items and exit code', async () => {
    const env = await adoptedProject();
    await writeText(nativeIn(env.project, CORE), 'local\n');
    await editTemplate(env.template, CORE, 'template v2\n');
    const run = await sync(env, '--json');
    assert.equal(run.code, 1);
    const result = JSON.parse(run.stdout);
    assert.equal(result.ok, false);
    assert.equal(result.items.find((item) => item.path === CORE).action, 'conflict');
  });

  it('rejects --take-template with --keep-local as a usage error', async () => {
    const env = await adoptedProject();
    assert.equal((await sync(env, '--take-template', '--keep-local')).code, 2);
  });

  it('refuses a manifest key outside the project and never prunes it', async () => {
    const env = await adoptedProject();
    const victim = path.join(path.dirname(env.project), 'outside', 'victim.txt');
    await writeText(victim, 'precious\n');
    const manifestFile = nativeIn(env.project, MANIFEST);
    const manifest = await readJson(manifestFile);
    manifest.files['../outside/victim.txt'] = { policy: 'managed', sha256: contentHash(Buffer.from('precious\n')) };
    await writeText(manifestFile, JSON.stringify(manifest));
    const run = await sync(env, '--prune');
    assert.equal(run.code, 1);
    assert.match(run.stderr, /manifest\.json: files\["\.\.\/outside\/victim\.txt"\]: the key is not a safe relative path/);
    assert.equal(await readText(victim), 'precious\n');
  });

  it('refuses an invalid-JSON manifest and a manifest with a bad entry, naming the problem', async () => {
    const env = await adoptedProject();
    const manifestFile = nativeIn(env.project, MANIFEST);
    const good = await readJson(manifestFile);
    await writeText(manifestFile, '{ "files": ');
    const broken = await sync(env);
    assert.equal(broken.code, 1);
    assert.match(broken.stderr, /manifest\.json is not valid JSON/);
    await writeText(manifestFile, JSON.stringify({ ...good, files: { ...good.files, 'docs/old.md': null } }));
    const badEntry = await sync(env);
    assert.equal(badEntry.code, 1);
    assert.match(badEntry.stderr, /manifest\.json: files\["docs\/old\.md"\] must be an object/);
    await writeText(manifestFile, JSON.stringify({ ...good, files: { ...good.files, [CORE]: { policy: 'shared', sha256: 'abc' } } }));
    const badFields = await sync(env);
    assert.equal(badFields.code, 1);
    assert.match(badFields.stderr, /"policy" must be managed or owned/);
    assert.match(badFields.stderr, /"sha256" must be a sha256 hex string/);
  });

  it('does not recreate an owned file the project deleted', async () => {
    const env = await adoptedProject();
    await rm(nativeIn(env.project, 'docs/manager/board.md'));
    const run = await sync(env);
    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /^skip {8}docs\/manager\/board\.md {2}\(deleted by the project; not recreated\)$/m);
    assert.equal(await pathExists(nativeIn(env.project, 'docs/manager/board.md')), false);
    assert.ok((await readJson(nativeIn(env.project, MANIFEST))).files['docs/manager/board.md']);
    assert.equal((await sync(env)).code, 0);
    assert.equal(await pathExists(nativeIn(env.project, 'docs/manager/board.md')), false);
  });

  it('fills {{PROJECT}} in a new owned file with the --name given at adopt', async () => {
    const template = await copyFixtureTemplate();
    const project = await makeProject('folder-name');
    assert.equal((await runCli(['adopt', '--project', project, '--template', template, '--name', 'Orchard Demo'])).code, 0);
    assert.equal((await readJson(nativeIn(project, MANIFEST))).projectName, 'Orchard Demo');
    const env = { template, project };
    await editTemplate(template, 'docs/ROADMAP.md', '# Roadmap for {{PROJECT}}\n');
    await setPack(template, (pack) => { pack.files.push({ path: 'docs/ROADMAP.md', policy: 'owned' }); });
    assert.equal((await sync(env)).code, 0);
    assert.equal(await readText(project, 'docs', 'ROADMAP.md'), '# Roadmap for Orchard Demo\n');
    assert.equal((await readJson(nativeIn(project, MANIFEST))).projectName, 'Orchard Demo');
  });

  it('leaves no temporary manifest file behind', async () => {
    const env = await adoptedProject();
    assert.equal((await sync(env)).code, 0);
    assert.equal(await pathExists(`${nativeIn(env.project, MANIFEST)}.tmp`), false);
  });
});

describe('decideManaged', () => {
  const recorded = { policy: 'managed', sha256: 'A' };
  it('covers every case', () => {
    assert.equal(decideManaged({ projectHash: null, templateHash: 'B', recorded }).action, 'create');
    assert.equal(decideManaged({ projectHash: 'B', templateHash: 'B', recorded }).action, 'unchanged');
    assert.equal(decideManaged({ projectHash: 'A', templateHash: 'B', recorded }).action, 'update');
    assert.equal(decideManaged({ projectHash: 'C', templateHash: 'B', recorded }).action, 'conflict');
    assert.equal(decideManaged({ projectHash: 'C', templateHash: 'A', recorded }).action, 'conflict');
    assert.equal(decideManaged({ projectHash: 'C', templateHash: 'B', recorded: undefined }).action, 'conflict');
    const kept = { policy: 'managed', sha256: 'L', templateSha256: 'T' };
    assert.equal(decideManaged({ projectHash: 'L', templateHash: 'T', recorded: kept }).action, 'kept');
    assert.equal(decideManaged({ projectHash: 'L', templateHash: 'U', recorded: kept }).action, 'conflict');
  });
});
