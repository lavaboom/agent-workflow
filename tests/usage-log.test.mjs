// The hook runs as a child process with CLAUDE_CONFIG_DIR, HOME and USERPROFILE pointed at temp folders,
// so these tests never touch the real ~/.claude.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { FIXTURES_DIR, HOOK, makeTempDir, pathExists, removeTempDirs, runNode } from './helpers/setup.mjs';

const TRANSCRIPTS = path.join(FIXTURES_DIR, 'transcripts');
const EXPECTED_MODELS = {
  'claude-sonnet-5-5': { input: 101, output: 52, cache_read: 1003, cache_write: 204 },
  'claude-opus-5-5': { input: 10, output: 5, cache_read: 20, cache_write: 30 },
};

after(removeTempDirs);

async function sandbox() {
  const home = await makeTempDir('aw-home-');
  const claudeDir = path.join(await makeTempDir('aw-claude-'), 'config');
  const repo = path.join(await makeTempDir('aw-repo-'), 'my-repo');
  const cwd = path.join(repo, 'src', 'deep');
  await mkdir(path.join(repo, '.git'), { recursive: true });
  await mkdir(cwd, { recursive: true });
  const env = { CLAUDE_CONFIG_DIR: claudeDir, HOME: home, USERPROFILE: home };
  return { home, claudeDir, repo, cwd, env, usageFile: path.join(claudeDir, 'metrics', 'usage.jsonl') };
}

async function runHook(box, input) {
  return runNode(HOOK, [], { input: typeof input === 'string' ? input : JSON.stringify(input), env: box.env });
}

async function usageRows(file) {
  return (await readFile(file, 'utf8')).trimEnd().split('\n').map((line) => JSON.parse(line));
}

describe('usage-log hook', () => {
  it('sums usage per model (two models, cache fields, repeated blocks counted once) and appends one row', async () => {
    const box = await sandbox();
    const input = { session_id: 'sess-1', transcript_path: path.join(TRANSCRIPTS, 'two-models.jsonl'), cwd: box.cwd };
    const run = await runHook(box, input);
    assert.equal(run.code, 0);
    assert.equal(run.stdout, '');
    const rows = await usageRows(box.usageFile);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].project, 'my-repo');
    assert.equal(rows[0].session_id, 'sess-1');
    assert.match(rows[0].ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.deepEqual(rows[0].models, EXPECTED_MODELS);
    assert.equal(await pathExists(path.join(box.home, '.claude')), false);
  });

  it('adds the session subagents transcripts, counting a message id once across files', async () => {
    const box = await sandbox();
    const input = { session_id: 'with-subagent', transcript_path: path.join(TRANSCRIPTS, 'with-subagent.jsonl'), cwd: box.cwd };
    const run = await runHook(box, input);
    assert.equal(run.code, 0);
    assert.equal(run.stdout, '');
    const rows = await usageRows(box.usageFile);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].models, {
      'claude-sonnet-5-5': { input: 105, output: 16, cache_read: 1007, cache_write: 58 },
      'claude-opus-5-5': { input: 1, output: 2, cache_read: 3, cache_write: 4 },
    });
  });

  it('does not follow a session id that leaves the transcript folder', async () => {
    const box = await sandbox();
    const root = await makeTempDir('aw-escape-');
    const transcriptDir = path.join(root, 'projects', 'slug');
    await mkdir(transcriptDir, { recursive: true });
    const transcript = path.join(transcriptDir, 'main.jsonl');
    await writeFile(transcript, await readFile(path.join(TRANSCRIPTS, 'two-models.jsonl')));
    const outside = path.join(root, 'outside', 'subagents');
    await mkdir(outside, { recursive: true });
    await writeFile(path.join(outside, 'agent-evil.jsonl'), await readFile(path.join(TRANSCRIPTS, 'with-subagent', 'subagents', 'agent-a1.jsonl')));
    for (const sessionId of ['../../outside', '..', 'a/b']) {
      await runHook(box, { session_id: sessionId, transcript_path: transcript, cwd: box.cwd });
    }
    const rows = await usageRows(box.usageFile);
    assert.equal(rows.length, 3);
    for (const row of rows) assert.deepEqual(row.models, EXPECTED_MODELS);
  });

  it('appends a second row on a second Stop', async () => {
    const box = await sandbox();
    const input = { session_id: 'sess-1', transcript_path: path.join(TRANSCRIPTS, 'two-models.jsonl'), cwd: box.cwd };
    await runHook(box, input);
    await runHook(box, input);
    assert.equal((await usageRows(box.usageFile)).length, 2);
  });

  it('ignores a truncated last line', async () => {
    const box = await sandbox();
    const run = await runHook(box, { session_id: 's', transcript_path: path.join(TRANSCRIPTS, 'truncated.jsonl'), cwd: box.cwd });
    assert.equal(run.code, 0);
    assert.equal(run.stdout, '');
    const rows = await usageRows(box.usageFile);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].models, EXPECTED_MODELS);
  });

  it('writes nothing and exits 0 for a missing transcript', async () => {
    const box = await sandbox();
    const run = await runHook(box, { session_id: 's', transcript_path: path.join(box.home, 'nope.jsonl'), cwd: box.cwd });
    assert.equal(run.code, 0);
    assert.equal(run.stdout, '');
    assert.equal(await pathExists(box.usageFile), false);
  });

  it('exits 0 silently on input that is not JSON', async () => {
    const box = await sandbox();
    const run = await runHook(box, 'this is not json');
    assert.equal(run.code, 0);
    assert.equal(run.stdout, '');
    assert.equal(run.stderr, '');
    assert.equal(await pathExists(box.usageFile), false);
  });

  it('names a linked worktree after its main checkout, and a folder without git after itself', async () => {
    const box = await sandbox();
    const worktree = path.join(await makeTempDir('aw-wt-'), 'task-012');
    await mkdir(path.join(box.repo, '.git', 'worktrees', 'task-012'), { recursive: true });
    await mkdir(worktree, { recursive: true });
    await writeFile(path.join(worktree, '.git'), `gitdir: ${path.join(box.repo, '.git', 'worktrees', 'task-012')}\n`);
    const transcript = path.join(TRANSCRIPTS, 'two-models.jsonl');
    await runHook(box, { session_id: 'a', transcript_path: transcript, cwd: worktree });
    const plain = path.join(await makeTempDir('aw-plain-'), 'plain-folder');
    await mkdir(plain);
    await runHook(box, { session_id: 'b', transcript_path: transcript, cwd: plain });
    const rows = await usageRows(box.usageFile);
    assert.equal(rows[0].project, 'my-repo');
    assert.equal(rows[1].project, 'plain-folder');
  });

  it('accepts hook input that starts with a UTF-8 byte order mark', async () => {
    const box = await sandbox();
    const input = JSON.stringify({ session_id: 'bom', transcript_path: path.join(TRANSCRIPTS, 'two-models.jsonl'), cwd: box.cwd });
    const run = await runHook(box, `${String.fromCharCode(0xfeff)}${input}`);
    assert.equal(run.code, 0);
    assert.equal((await usageRows(box.usageFile))[0].session_id, 'bom');
  });

  it('falls back to the transcript name for a missing session_id', async () => {
    const box = await sandbox();
    await runHook(box, { transcript_path: path.join(TRANSCRIPTS, 'two-models.jsonl'), cwd: box.cwd });
    assert.equal((await usageRows(box.usageFile))[0].session_id, 'two-models');
  });
});
