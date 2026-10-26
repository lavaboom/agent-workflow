import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { writeBytesAtomic } from '../src/files.mjs';
import { isSafeRelativePath } from '../src/pack.mjs';
import { makeTempDir, removeTempDirs, writeText } from './helpers/setup.mjs';

after(removeTempDirs);

describe('writeBytesAtomic', () => {
  it('creates parents, replaces an existing file and leaves no temporary file', async () => {
    const dir = await makeTempDir('aw-atomic-');
    const file = path.join(dir, 'nested', 'manifest.json');
    await writeBytesAtomic(file, Buffer.from('first\n'));
    await writeText(file, 'changed by hand\n');
    await writeBytesAtomic(file, Buffer.from('second\n'));
    assert.equal(await readFile(file, 'utf8'), 'second\n');
    assert.deepEqual(await readdir(path.join(dir, 'nested')), ['manifest.json']);
  });
});

describe('isSafeRelativePath', () => {
  it('accepts forward-slash relative paths and refuses anything that can leave the root', () => {
    for (const ok of ['AGENTS.md', '.claude/rules/core.md', 'docs/harness/a.b.md']) assert.equal(isSafeRelativePath(ok), true, ok);
    for (const bad of ['', '../x', 'a/../b', './a', 'a//b', '/abs', 'C:/x', 'a\\b', 'a/']) assert.equal(isSafeRelativePath(bad), false, bad);
  });
});
