import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { after, describe, it } from 'node:test';
import { listFilesRecursive } from '../src/files.mjs';
import { readHeader } from '../src/headers.mjs';
import {
  FIXTURE_TEMPLATE, copyFixtureTemplate, makeProject, nativeIn, readJson, removeTempDirs, runCli, writeText,
} from './helpers/setup.mjs';

after(removeTempDirs);

async function adoptedProject() {
  const project = await makeProject();
  const run = await runCli(['adopt', '--project', project, '--template', FIXTURE_TEMPLATE]);
  assert.equal(run.code, 0, run.stderr);
  return project;
}

async function check(project, ...flags) {
  return runCli(['check', '--project', project, '--template', FIXTURE_TEMPLATE, ...flags]);
}

async function checkTemplate(template) {
  return runCli(['check', '--template-only', '--template', template]);
}

function lines(count, prefix = 'line') {
  return Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`).join('\n').concat('\n');
}

const RULE_HEADER = '<!--\nsource: test\napplies: test\nreview-by: 2999-01-01\n-->\n';

describe('check (project)', () => {
  it('passes every check on a freshly adopted fixture project', async () => {
    const project = await adoptedProject();
    const run = await check(project);
    assert.equal(run.code, 0, run.stdout);
    assert.doesNotMatch(run.stdout, /^(warn|fail) /m);
    for (const name of ['entry-size', 'always-on-rules', 'rule-metadata', 'review-by', 'manifest-drift', 'vendored-drift', 'board-lines', 'ledger-shape', 'no-claude-md']) {
      assert.match(run.stdout, new RegExp(`^ok {4}${name}: `, 'm'), name);
    }
    assert.match(run.stdout, /^project checks: 9 ok, 0 warn, 0 fail$/m);
  });

  it('passes with CRLF line endings everywhere', async () => {
    const project = await adoptedProject();
    for (const file of await listFilesRecursive(project)) {
      if (!file.endsWith('.md')) continue;
      const target = nativeIn(project, file);
      await writeText(target, (await readFile(target, 'utf8')).replace(/\n/g, '\r\n'));
    }
    const run = await check(project);
    assert.equal(run.code, 0, run.stdout);
    assert.doesNotMatch(run.stdout, /^(warn|fail) /m);
  });

  it('warns on an AGENTS.md over 100 lines and fails over 150', async () => {
    const project = await adoptedProject();
    await writeText(nativeIn(project, 'AGENTS.md'), lines(120));
    const warned = await check(project);
    assert.equal(warned.code, 0);
    assert.match(warned.stdout, /^warn {2}entry-size: AGENTS\.md has 120 lines \(over 100\)$/m);
    await writeText(nativeIn(project, 'AGENTS.md'), lines(151));
    const failed = await check(project);
    assert.equal(failed.code, 1);
    assert.match(failed.stdout, /^fail {2}entry-size: AGENTS\.md has 151 lines \(over 150\)$/m);
  });

  it('fails when the board lacks a Next step: line', async () => {
    const project = await adoptedProject();
    await writeText(nativeIn(project, 'docs/manager/board.md'), '# Board\n\nCurrent issues: none\n');
    const run = await check(project);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^fail {2}board-lines: docs\/manager\/board\.md has no "Next step:" line$/m);
  });

  it('fails on a malformed ledger row, naming the line', async () => {
    const project = await adoptedProject();
    const ledger = nativeIn(project, 'docs/harness/ledger.md');
    const text = await readFile(ledger, 'utf8');
    await writeText(ledger, `${text}| 2026-10-20 | task-001 | build | builder | claude | sonnet | high | docs | 1 | ok | none | |\n`);
    const run = await check(project);
    assert.equal(run.code, 1);
    const lineNumber = text.split('\n').length;
    assert.match(run.stdout, new RegExp(`^fail {2}ledger-shape: docs/harness/ledger\\.md line ${lineNumber}: unknown outcome "ok"$`, 'm'));
  });

  it('warns on a past review-by, naming the file', async () => {
    const project = await adoptedProject();
    await writeText(nativeIn(project, 'docs/harness/old.md'), '<!-- source: a\napplies: b\nreview-by: 2020-01-01 -->\n# Old\n');
    const run = await check(project);
    assert.equal(run.code, 0);
    assert.match(run.stdout, /^warn {2}review-by: docs\/harness\/old\.md review-by 2020-01-01 is past$/m);
  });

  it('warns on missing metadata, too many always-on rules and a long always-on rule', async () => {
    const project = await adoptedProject();
    for (const name of ['a', 'b', 'c']) await writeText(nativeIn(project, `.claude/rules/${name}.md`), `${RULE_HEADER}# ${name}\n`);
    await writeText(nativeIn(project, '.claude/rules/long.md'), `${RULE_HEADER}${lines(70)}`);
    await writeText(nativeIn(project, 'docs/harness/bare.md'), '# Bare\n');
    const run = await check(project);
    assert.equal(run.code, 0);
    assert.match(run.stdout, /^warn {2}always-on-rules: 5 always-on rules \(more than 4\)/m);
    assert.match(run.stdout, /^warn {2}always-on-rules: \.claude\/rules\/long\.md is always-on and has 75 lines \(over 60\)$/m);
    assert.match(run.stdout, /^warn {2}rule-metadata: docs\/harness\/bare\.md header lacks source: applies: review-by:$/m);
  });

  it('warns on manifest drift and on an older template version', async () => {
    const project = await adoptedProject();
    await writeText(nativeIn(project, '.claude/rules/core.md'), `${RULE_HEADER}# edited\n`);
    const manifestFile = nativeIn(project, 'docs/harness/manifest.json');
    const manifest = await readJson(manifestFile);
    manifest.templateVersion = '2.0.0';
    await writeText(manifestFile, JSON.stringify(manifest));
    const run = await check(project);
    assert.equal(run.code, 0);
    assert.match(run.stdout, /^warn {2}manifest-drift: \.claude\/rules\/core\.md edited locally/m);
    assert.match(run.stdout, /^warn {2}manifest-drift: update available: 2\.0\.0 → 2\.1\.0$/m);
  });

  it('warns on a CLAUDE.md unless it only imports AGENTS.md', async () => {
    const project = await adoptedProject();
    await writeText(nativeIn(project, 'CLAUDE.md'), '# Old instructions\n');
    assert.match((await check(project)).stdout, /^warn {2}no-claude-md: AGENTS\.md is the entry file/m);
    await writeText(nativeIn(project, 'CLAUDE.md'), '@AGENTS.md\r\n');
    assert.match((await check(project)).stdout, /^ok {4}no-claude-md: CLAUDE\.md only imports @AGENTS\.md$/m);
  });

  it('--json gives counts and results', async () => {
    const project = await adoptedProject();
    await rm(nativeIn(project, 'docs/manager/board.md'));
    const run = await check(project, '--json');
    assert.equal(run.code, 1);
    const result = JSON.parse(run.stdout);
    assert.equal(result.counts.fail, 1);
    assert.equal(result.results.find((item) => item.level === 'fail').check, 'board-lines');
  });

  it('fails manifest-drift on an invalid-JSON manifest and still runs every other check', async () => {
    const project = await adoptedProject();
    await writeText(nativeIn(project, 'docs/harness/manifest.json'), '{ "files": ');
    const run = await check(project);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^fail {2}manifest-drift: docs\/harness\/manifest\.json is not valid JSON/m);
    assert.match(run.stdout, /^ok {4}board-lines: /m);
    assert.match(run.stdout, /^ok {4}ledger-shape: /m);
  });

  it('fails manifest-drift on a bad entry and never reads outside the project', async () => {
    const project = await adoptedProject();
    const manifestFile = nativeIn(project, 'docs/harness/manifest.json');
    const manifest = await readJson(manifestFile);
    manifest.files['docs/old.md'] = null;
    manifest.vendored = { '../outside': { kind: 'directory', source: 'skills/x', version: '1', sha256: { 'a.md': 'f'.repeat(64) } } };
    await writeText(manifestFile, JSON.stringify(manifest));
    const run = await check(project);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^fail {2}manifest-drift: docs\/harness\/manifest\.json: files\["docs\/old\.md"\] must be an object$/m);
    assert.match(run.stdout, /^fail {2}manifest-drift: docs\/harness\/manifest\.json: vendored\["\.\.\/outside"\]: the key is not a safe relative path$/m);
    assert.match(run.stdout, /^warn {2}vendored-drift: not checked: the manifest is invalid/m);
    assert.match(run.stdout, /^ok {4}entry-size: /m);
  });
});

describe('check --template-only', () => {
  it('passes on the fixture template', async () => {
    const run = await checkTemplate(FIXTURE_TEMPLATE);
    assert.equal(run.code, 0, run.stdout);
    assert.doesNotMatch(run.stdout, /^(warn|fail) /m);
    assert.doesNotMatch(run.stdout, /template\.json is in template|NEXT-STEPS\.txt is in template/);
  });

  it('fails on an unlisted file and on a listed file that is absent', async () => {
    const template = await copyFixtureTemplate();
    await writeText(nativeIn(template, 'docs/extra.md'), 'extra\n');
    await rm(nativeIn(template, 'docs/manager/board.md'));
    const run = await checkTemplate(template);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^fail {2}pack-listing: docs\/extra\.md is in template\/ but not in template\.json$/m);
    assert.match(run.stdout, /^fail {2}pack-listing: docs\/manager\/board\.md is listed in template\.json but absent$/m);
  });

  it('does not require files for from entries, but requires their target', async () => {
    const template = await copyFixtureTemplate();
    const ok = await checkTemplate(template);
    assert.doesNotMatch(ok.stdout, /\.agents\/skills\/manager\/SKILL\.md is listed/);
    const file = nativeIn(template, 'template.json');
    const pack = await readJson(file);
    pack.files.push({ path: '.agents/skills/other/SKILL.md', policy: 'managed', from: '.claude/skills/other/SKILL.md' });
    await writeText(file, JSON.stringify(pack));
    const run = await checkTemplate(template);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^fail {2}from-targets: \.agents\/skills\/other\/SKILL\.md has from "\.claude\/skills\/other\/SKILL\.md", which is not listed$/m);
  });

  it('fails on a placeholder in a managed file, an oversized AGENTS.md and missing metadata', async () => {
    const template = await copyFixtureTemplate();
    await writeText(nativeIn(template, 'docs/harness/README.md'), '# {{PROJECT}}\n');
    await writeText(nativeIn(template, 'AGENTS.md'), lines(101));
    await writeText(nativeIn(template, '.claude/rules/core.md'), '# Core without a header\n');
    const run = await checkTemplate(template);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^fail {2}no-placeholders: docs\/harness\/README\.md is managed and contains "\{\{"$/m);
    assert.match(run.stdout, /^fail {2}entry-size: AGENTS\.md has 101 lines \(over 100\)$/m);
    assert.match(run.stdout, /^fail {2}rule-metadata: \.claude\/rules\/core\.md header lacks source: applies: review-by:$/m);
  });

  it('fails on {{HARNESS_CLI}} in a managed file and allows it in an owned file', async () => {
    const template = await copyFixtureTemplate();
    const building = nativeIn(template, 'docs/harness/building.md');
    await writeText(building, `${await readFile(building, 'utf8')}Run {{HARNESS_CLI}} check.\n`);
    const run = await checkTemplate(template);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^fail {2}no-placeholders: docs\/harness\/building\.md is managed and contains "\{\{"$/m);
    assert.doesNotMatch(run.stdout, /no-placeholders: AGENTS\.md/);
  });

  it('warns, not fails, when NEXT-STEPS.txt is missing', async () => {
    const template = await copyFixtureTemplate();
    await rm(nativeIn(template, 'NEXT-STEPS.txt'));
    const run = await checkTemplate(template);
    assert.equal(run.code, 0);
    assert.match(run.stdout, /^warn {2}next-steps: /m);
  });

  it('fails on an invalid template.json', async () => {
    const template = await copyFixtureTemplate();
    await writeText(nativeIn(template, 'template.json'), '{ "version": "1", "files": [ { "path": "../x", "policy": "owned" } ] }');
    const run = await checkTemplate(template);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^fail {2}pack-manifest: template\.json: files\[0\]: bad "path"/m);
  });
});

describe('readHeader', () => {
  it('reads frontmatter, a comment after a heading, and paths:', () => {
    const header = readHeader('---\r\npaths: src/**\r\n---\r\n# Title\r\n\r\n<!-- source: s\r\napplies: a\r\nreview-by: "2027-01-01" -->\r\nBody\r\n');
    assert.deepEqual(header, { hasFrontmatter: true, hasPaths: true, source: 's', applies: 'a', reviewBy: '2027-01-01' });
  });

  it('ignores keys in the body', () => {
    const header = readHeader('# Title\n\nBody text\n\n<!-- source: late -->\n');
    assert.equal(header.source, null);
  });
});
