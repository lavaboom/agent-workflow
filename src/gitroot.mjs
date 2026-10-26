// Resolves a project's name the way the usage-log hook does: the basename of the git root of a
// directory (walking up for a `.git` entry; a worktree resolves to its main checkout), else the
// directory's own basename. Kept in step with template/.claude/hooks/usage-log.mjs, which cannot import it.
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export async function findGitRoot(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    const dotGit = path.join(dir, '.git');
    const info = await statOrNull(dotGit);
    if (info) return info.isFile() ? mainCheckoutOf(dir, dotGit) : dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function projectNameFor(dir) {
  const root = await findGitRoot(dir);
  return path.basename(root ?? path.resolve(dir));
}

// A `.git` file says `gitdir: <main>/.git/worktrees/<name>` in a linked worktree.
async function mainCheckoutOf(dir, dotGitFile) {
  let text;
  try {
    text = await readFile(dotGitFile, 'utf8');
  } catch {
    return dir;
  }
  const match = /^gitdir:\s*(.+?)\s*$/m.exec(text);
  if (!match) return dir;
  const gitDir = path.resolve(dir, match[1]);
  const worktrees = path.dirname(gitDir);
  const dotGitDir = path.dirname(worktrees);
  if (path.basename(worktrees) === 'worktrees' && path.basename(dotGitDir) === '.git') return path.dirname(dotGitDir);
  return dir;
}

async function statOrNull(target) {
  try {
    return await stat(target);
  } catch {
    return null;
  }
}
