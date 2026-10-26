import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { after, describe, it } from 'node:test';
import { readCheckoutVersion } from '../src/checkout-version.mjs';
import { contentHash } from '../src/hash.mjs';
import { destinationFor } from '../src/vendor.mjs';
import {
  FIXTURES_DIR, FIXTURE_TEMPLATE, makeProject, makeTempDir, nativeIn, pathExists, readJson, readText, removeTempDirs, runCli, writeText,
} from './helpers/setup.mjs';

const CHECKOUT = path.join(FIXTURES_DIR, 'checkout');
const MANIFEST = 'docs/harness/manifest.json';

after(removeTempDirs);

async function adoptedProject() {
  const project = await makeProject();
  assert.equal((await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE])).code, 0);
  return project;
}

function vendor(project, ...args) {
  return runCli(['vendor', '--project', project, '--from', CHECKOUT, ...args]);
}

async function hashOf(...segments) {
  return contentHash(await readFile(path.join(...segments)));
}

describe('vendor', () => {
  it('copies skills/x (recursively) and agents/y.md and records provenance with hashes and VERSION', async () => {
    const project = await adoptedProject();
    const run = await vendor(project, 'skills/x', 'agents/y.md');
    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /^create {6}\.claude\/skills\/x\/SKILL\.md$/m);
    assert.match(run.stdout, /^create {6}\.claude\/skills\/x\/references\/notes\.md$/m);
    assert.match(run.stdout, /^create {6}\.claude\/agents\/y\.md$/m);
    assert.match(run.stdout, /^write {7}docs\/harness\/manifest\.json {2}\(vendored from .+ at 1\.4\.0\)$/m);
    assert.equal(await readText(project, '.claude', 'agents', 'y.md'), await readText(CHECKOUT, 'agents', 'y.md'));
    const { vendored } = await readJson(nativeIn(project, MANIFEST));
    assert.deepEqual(Object.keys(vendored).sort(), ['.claude/agents/y.md', '.claude/skills/x']);
    const skill = vendored['.claude/skills/x'];
    assert.equal(skill.from, path.resolve(CHECKOUT));
    assert.equal(skill.source, 'skills/x');
    assert.equal(skill.version, '1.4.0');
    assert.equal(skill.vendoredAt, '2026-10-26T12:00:00Z');
    assert.equal(skill.kind, 'directory');
    assert.deepEqual(skill.sha256, {
      'SKILL.md': await hashOf(CHECKOUT, 'skills', 'x', 'SKILL.md'),
      'references/notes.md': await hashOf(CHECKOUT, 'skills', 'x', 'references', 'notes.md'),
    });
    assert.deepEqual(vendored['.claude/agents/y.md'].sha256, { 'y.md': await hashOf(CHECKOUT, 'agents', 'y.md') });
    assert.equal(vendored['.claude/agents/y.md'].kind, 'file');
  });

  it('flattens rules/<lang>/<file>.md and copies hooks/<file>', async () => {
    const project = await adoptedProject();
    const run = await vendor(project, 'rules/python/style.md', 'hooks\\notify.sh');
    assert.equal(run.code, 0, run.stderr);
    assert.ok(await pathExists(nativeIn(project, '.claude/rules/python-style.md')));
    assert.ok(await pathExists(nativeIn(project, '.claude/hooks/notify.sh')));
  });

  it('refuses an unsupported path with exit 2 and the reason', async () => {
    const project = await adoptedProject();
    const run = await vendor(project, 'docs/readme.md');
    assert.equal(run.code, 2);
    assert.match(run.stderr, /"docs\/readme\.md" is not under skills\/, agents\/, rules\/, hooks\//);
    assert.equal((await vendor(project, 'skills/../docs')).code, 2);
    assert.equal((await runCli(['vendor', '--project', project, 'skills/x'])).code, 2);
    assert.equal((await runCli(['vendor', '--project', project, '--from', CHECKOUT])).code, 2);
  });

  it('refuses a differing destination, skips an identical one, overwrites with --force', async () => {
    const project = await adoptedProject();
    await writeText(nativeIn(project, '.claude/agents/y.md'), 'my trimmed agent\n');
    const refused = await vendor(project, 'agents/y.md', 'skills/x');
    assert.equal(refused.code, 1);
    assert.match(refused.stdout, /^conflict {4}\.claude\/agents\/y\.md {2}\(destination exists and differs\)$/m);
    assert.match(refused.stderr, /nothing written/);
    assert.equal(await pathExists(nativeIn(project, '.claude/skills/x/SKILL.md')), false);
    assert.equal((await readJson(nativeIn(project, MANIFEST))).vendored, undefined);
    const forced = await vendor(project, 'agents/y.md', '--force');
    assert.equal(forced.code, 0, forced.stderr);
    assert.match(forced.stdout, /^overwritten \.claude\/agents\/y\.md/m);
    assert.equal(await readText(project, '.claude', 'agents', 'y.md'), await readText(CHECKOUT, 'agents', 'y.md'));
    const again = await vendor(project, 'agents/y.md');
    assert.equal(again.code, 0);
    assert.match(again.stdout, /^skip {8}\.claude\/agents\/y\.md {2}\(identical\)$/m);
  });

  it('check reports vendored-drift after a vendored file is edited, and sync keeps the provenance', async () => {
    const project = await adoptedProject();
    await vendor(project, 'agents/y.md');
    const clean = await runCli(['check', '--project', project, '--template', FIXTURE_TEMPLATE]);
    assert.match(clean.stdout, /^ok {4}vendored-drift: 1 vendored file\(s\) match the manifest$/m);
    await writeText(nativeIn(project, '.claude/agents/y.md'), '---\nname: y\n---\nTrimmed.\n');
    const drift = await runCli(['check', '--project', project, '--template', FIXTURE_TEMPLATE]);
    assert.equal(drift.code, 0);
    assert.match(drift.stdout, /^warn {2}vendored-drift: \.claude\/agents\/y\.md differs from the vendored copy of agents\/y\.md 1\.4\.0: a local edit \(expected after trimming an ECC agent\)$/m);
    assert.equal((await runCli(['sync', '--project', project, '--template', FIXTURE_TEMPLATE])).code, 0);
    assert.ok((await readJson(nativeIn(project, MANIFEST))).vendored['.claude/agents/y.md']);
  });

  it('--dry-run writes nothing; --json reports the provenance', async () => {
    const project = await adoptedProject();
    const dry = await vendor(project, 'skills/x', '--dry-run', '--json');
    assert.equal(dry.code, 0);
    const result = JSON.parse(dry.stdout);
    assert.equal(result.dryRun, true);
    assert.equal(result.vendored['.claude/skills/x'].version, '1.4.0');
    assert.equal(result.items.every((item) => !('bytes' in item)), true);
    assert.equal(await pathExists(nativeIn(project, '.claude/skills/x')), false);
    assert.equal((await readJson(nativeIn(project, MANIFEST))).vendored, undefined);
  });

  it('refuses when not adopted or when an item is missing from the checkout', async () => {
    const bare = await makeProject();
    const notAdopted = await vendor(bare, 'agents/y.md');
    assert.equal(notAdopted.code, 1);
    assert.match(notAdopted.stderr, /not adopted; use adopt/);
    const project = await adoptedProject();
    const missing = await vendor(project, 'agents/nope.md');
    assert.equal(missing.code, 1);
    assert.match(missing.stderr, /agents\/nope\.md not found in /);
  });
});

describe('destinationFor', () => {
  it('maps items to .claude/', () => {
    assert.equal(destinationFor('skills/x', true), '.claude/skills/x');
    assert.equal(destinationFor('agents/y.md', false), '.claude/agents/y.md');
    assert.equal(destinationFor('rules/python/style.md', false), '.claude/rules/python-style.md');
    assert.equal(destinationFor('rules/python', true), '.claude/rules/python');
    assert.equal(destinationFor('hooks/notify.sh', false), '.claude/hooks/notify.sh');
  });
});

describe('readCheckoutVersion', () => {
  const COMMIT = 'a'.repeat(40);

  async function checkoutWithGit(files) {
    const dir = path.join(await makeTempDir('aw-co-'), 'checkout');
    await cp(CHECKOUT, dir, { recursive: true });
    for (const [relative, content] of Object.entries(files)) await writeText(nativeIn(dir, relative), content);
    return dir;
  }

  it('prefers a tag in packed-refs that points at HEAD (lightweight or peeled)', async () => {
    const dir = await checkoutWithGit({
      '.git/HEAD': 'ref: refs/heads/main\n',
      '.git/refs/heads/main': `${COMMIT}\n`,
      '.git/packed-refs': `# pack-refs with: peeled fully-peeled sorted\n${'b'.repeat(40)} refs/tags/v1.9.0\n^${COMMIT}\n${'c'.repeat(40)} refs/tags/v0.1.0\n`,
    });
    assert.deepEqual(await readCheckoutVersion(dir), { version: 'v1.9.0', via: 'git tag' });
  });

  it('peels a loose annotated tag object', async () => {
    const tagSha = 'd'.repeat(40);
    const body = `object ${COMMIT}\ntype commit\ntag v2.0.0\n\nrelease\n`;
    const dir = await checkoutWithGit({ '.git/HEAD': `${COMMIT}\n`, '.git/refs/tags/v2.0.0': `${tagSha}\n` });
    await mkdir(nativeIn(dir, `.git/objects/${tagSha.slice(0, 2)}`), { recursive: true });
    await writeFile(nativeIn(dir, `.git/objects/${tagSha.slice(0, 2)}/${tagSha.slice(2)}`), deflateSync(Buffer.from(`tag ${body.length}\0${body}`)));
    assert.deepEqual(await readCheckoutVersion(dir), { version: 'v2.0.0', via: 'git tag' });
  });

  it('falls back to VERSION when HEAD has no tag, then package.json, then unknown', async () => {
    const dir = await checkoutWithGit({ '.git/HEAD': `${COMMIT}\n` });
    assert.deepEqual(await readCheckoutVersion(dir), { version: '1.4.0', via: 'VERSION' });
    const noVersion = path.join(await makeTempDir('aw-co-'), 'plain');
    await writeText(nativeIn(noVersion, 'package.json'), '{ "version": "3.2.1" }');
    assert.deepEqual(await readCheckoutVersion(noVersion), { version: '3.2.1', via: 'package.json' });
    assert.deepEqual(await readCheckoutVersion(await makeTempDir('aw-co-')), { version: 'unknown', via: 'none' });
  });
});
