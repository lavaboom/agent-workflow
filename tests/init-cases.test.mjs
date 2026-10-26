// `init`: a Codex-only project, an empty project, an adopted project, refusals, links, the launcher.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { BIN, FIXTURE_TEMPLATE, REPO_DIR, makeProject, makeTempDir, nativeIn, pathExists, readJson, readText, removeTempDirs, runCli, runNode, writeText } from './helpers/setup.mjs';
import { V1_FILES, makeDirectoryLink, makeV1Project, snapshot } from './helpers/v1-project.mjs';

const TEMPLATE = path.join(REPO_DIR, 'template');
const PACK = await readJson(path.join(TEMPLATE, 'template.json'));

after(removeTempDirs);

describe('init on other projects', () => {
  it('a Codex-only project: the entry file moves, no settings are filled, a prose CLAUDE.md stays', async () => {
    const prose = '# Claude notes\n\nRead AGENTS.md, then the design docs.\n';
    const project = await makeV1Project({ files: { 'AGENTS.md': '# Demo\n\nWhat Demo is.\n\n## Rules\n\nBe kind.\n', 'CLAUDE.md': prose } });
    const run = await runCli(['init', '--project', project]);
    assert.equal(run.code, 0, run.stderr);
    assert.equal(await readText(project, 'CLAUDE.md'), prose);
    assert.match(run.stdout, /^kept {8}CLAUDE\.md {2}\(not the v1 import file/m);
    assert.match(run.stdout, /^moved {7}AGENTS\.md {2}\(to docs\/project-guide\.md; no v1 pointer paragraph; no Workflow settings table\)$/m);
    assert.doesNotMatch(run.stdout, /^filled /m);
    assert.match(await readText(project, 'docs', 'project-guide.md'), /-->\n\n# Demo\n\nWhat Demo is\.\n\n## Rules\n\nBe kind\.\n$/);
    assert.equal((await readText(project, 'AGENTS.md')).split('\n')[0], '# demo');
    assert.match(run.stdout, /\n {2}git add -A -- AGENTS\.md \.claude \.agents \.codex docs ecc-install\.json \.gitignore && git commit/);
    assert.match(run.stdout, /\n {2}0\. docs\/project-guide\.md holds the old AGENTS\.md/);
  });

  it('an empty project: init writes what adopt writes (fixture template, no .gitignore.harness)', async () => {
    const viaInit = await makeProject('same-name');
    const viaAdopt = await makeProject('same-name');
    const init = await runCli(['init', '--project', viaInit, '--template', FIXTURE_TEMPLATE]);
    const adopt = await runCli(['adopt', '--project', viaAdopt, '--template', FIXTURE_TEMPLATE]);
    assert.equal(init.code, 0, init.stderr);
    assert.equal(adopt.code, 0, adopt.stderr);
    assert.deepEqual(await snapshot(viaInit), await snapshot(viaAdopt));
    assert.ok(init.stdout.startsWith(adopt.stdout.trimEnd()), init.stdout);
    assert.doesNotMatch(init.stdout, /^(deleted|moved|filled|replaced|backup) /m);
  });

  it('an empty project with the real template: the same files, but .gitignore instead of .gitignore.harness', async () => {
    const viaInit = await makeProject('same-name');
    const viaAdopt = await makeProject('same-name');
    assert.equal((await runCli(['init', '--project', viaInit])).code, 0);
    assert.equal((await runCli(['adopt', '--project', viaAdopt])).code, 0);
    const fromInit = await snapshot(viaInit);
    const fromAdopt = await snapshot(viaAdopt);
    assert.deepEqual(fromInit['.gitignore'].toString(), (await readText(TEMPLATE, '.gitignore.harness')).replace(/\r\n/g, '\n'));
    for (const files of [fromInit, fromAdopt]) for (const p of ['.gitignore', '.gitignore.harness', 'docs/harness/manifest.json']) delete files[p];
    assert.deepEqual(fromInit, fromAdopt);
  });

  it('an adopted project: sync, then the .gitignore merge, then nothing on a later run', async () => {
    const project = await makeProject();
    await writeText(nativeIn(project, '.gitignore'), 'node_modules/\n');
    assert.equal((await runCli(['adopt', '--project', project])).code, 0);
    const first = await runCli(['init', '--project', project]);
    assert.equal(first.code, 0, first.stderr);
    assert.match(first.stdout, /^update {6}\.gitignore {2}\(added \d+ line\(s\) from \.gitignore\.harness\)$/m);
    assert.match(first.stdout, /^deleted {5}\.gitignore\.harness {2}\(merged into \.gitignore\)$/m);
    assert.ok(first.stdout.includes(`git add -A -- .claude .agents .codex docs && git commit -m "docs(harness): sync agent-workflow v${PACK.version}"`));
    assert.equal(await pathExists(nativeIn(project, '.gitignore.harness')), false);
    assert.match(await readText(project, '.gitignore'), /^node_modules\/\n.*\.claude\/settings\.local\.json\n/s);
    const second = await runCli(['init', '--project', project]);
    assert.equal(second.code, 0, second.stderr);
    assert.match(second.stdout, /^skip {8}\.gitignore\.harness {2}\(deleted by the project; not recreated\)$/m);
    assert.doesNotMatch(second.stdout, /git add/);
  });
});

describe('init refusals and links', () => {
  it('refuses, writing nothing, when docs/project-guide.md exists', async () => {
    const project = await makeV1Project({ files: { ...V1_FILES, 'docs/project-guide.md': '# already here\n' } });
    const before = await snapshot(project);
    const run = await runCli(['init', '--project', project]);
    assert.equal(run.code, 1);
    assert.match(run.stderr, /docs\/project-guide\.md already exists/);
    assert.deepEqual(await snapshot(project), before);
  });

  it('refuses when a backup with other content exists', async () => {
    const project = await makeV1Project({ files: { ...V1_FILES, 'docs/harness/init-backup/.codex/config.toml': 'older\n' } });
    const run = await runCli(['init', '--project', project]);
    assert.equal(run.code, 1);
    assert.match(run.stderr, /init-backup\/\.codex\/config\.toml already exists and differs/);
    assert.ok(await pathExists(nativeIn(project, 'CLAUDE.md')));
  });

  it('refuses to rewrite a file that is not valid UTF-8', async () => {
    const project = await makeV1Project();
    const board = nativeIn(project, 'docs/manager/board.md');
    await writeFile(board, Buffer.concat([Buffer.from('# Board\n\ncaf'), Buffer.from([0xe9]), Buffer.from('\n')]));
    const run = await runCli(['init', '--project', project]);
    assert.equal(run.code, 1);
    assert.match(run.stderr, /docs\/manager\/board\.md is not valid UTF-8/);
    assert.ok(await pathExists(nativeIn(project, 'AGENTS.md')));
  });

  it('removes a linked .claude/agents as a link and leaves its target alone', async () => {
    const project = await makeV1Project({ files: { 'AGENTS.md': '# Demo\n' } });
    const target = path.join(await makeTempDir('aw-link-'), 'shared-agents');
    await writeText(path.join(target, 'opus-high.md'), 'shared\n');
    await makeDirectoryLink(target, nativeIn(project, '.claude/agents'));
    const run = await runCli(['init', '--project', project]);
    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /^deleted {5}\.claude\/agents\/ {2}\(v1 link to .*; the link only, its target is untouched\)$/m);
    assert.equal(await readFile(path.join(target, 'opus-high.md'), 'utf8'), 'shared\n');
    assert.ok((await readFile(nativeIn(project, '.claude/agents/builder.md'))).equals(await readFile(nativeIn(TEMPLATE, '.claude/agents/builder.md'))));
  });
});

describe('init help and the launcher', () => {
  it('init --help documents the command', async () => {
    const run = await runNode(BIN, ['init', '--help']);
    assert.equal(run.code, 0);
    for (const text of ['init     migrate a project', 'docs/project-guide.md', 'docs/harness/init-backup/', 'scripts/fresh-init.cmd']) assert.ok(run.stdout.includes(text), text);
  });

  it('scripts/fresh-init.cmd runs init on the current folder and passes arguments through', async () => {
    const text = (await readText(REPO_DIR, 'scripts', 'fresh-init.cmd')).replace(/\r\n/g, '\n');
    assert.equal(text, [
      '@echo off', 'setlocal', 'set "AW=%AGENT_WORKFLOW_HOME%"', 'if "%AW%"=="" set "AW=C:\\code\\agent-workflow"',
      'if not exist "%AW%\\bin\\agent-workflow.mjs" (',
      '  echo agent-workflow was not found at "%AW%". Clone it there or set AGENT_WORKFLOW_HOME.', '  exit /b 2', ')',
      'node "%AW%\\bin\\agent-workflow.mjs" init --project "%CD%" %*', '',
    ].join('\n'));
  });
});
