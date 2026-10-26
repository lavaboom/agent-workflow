// `init`: find and remove what agent-workflow v1 left in a project. Only these, only when they match:
//   CLAUDE.md                     every non-blank line is an @import (the v1 import file)
//   docs/AGENT_PROTOCOL.md        mentions agent-workflow (a v1 pointer file)
//   docs/tasks/README.md          mentions agent-workflow (a v1 pointer file)
//   .claude/agents/               the directory, when it exists (a v1 copy)
//   .claude/skills/manager/       the directory, when it exists (a v1 copy)
// A link (junction, symlink) at a directory path is removed as a link: what it points at is untouched.
import { lstat, readdir, readlink, rm } from 'node:fs/promises';
import path from 'node:path';
import { nativePath, readTextIfExists } from './files.mjs';
import { splitLines } from './text.mjs';

export const V1_IMPORT_FILE = 'CLAUDE.md';
export const V1_POINTER_FILES = ['docs/AGENT_PROTOCOL.md', 'docs/tasks/README.md'];
export const V1_DIRECTORIES = ['.claude/agents', '.claude/skills/manager'];
const POINTER_MARK = 'agent-workflow';

// At least one line, and every non-blank line starts with @.
export function isV1ImportFile(text) {
  const lines = splitLines(text).map((line) => line.trim()).filter((line) => line !== '');
  return lines.length > 0 && lines.every((line) => line.startsWith('@'));
}

export function isV1PointerFile(text) {
  return text.includes(POINTER_MARK);
}

// Returns { items, removed } where items are report lines ({ action: 'deleted' | 'kept', path, note, kind })
// and removed(posixPath) says whether a path is gone once the cleanup is applied.
export async function planV1Cleanup(projectDir) {
  const items = [];
  const claudeMd = await readFileOnly(projectDir, V1_IMPORT_FILE);
  if (claudeMd !== null && isV1ImportFile(claudeMd)) {
    items.push({ action: 'deleted', path: V1_IMPORT_FILE, kind: 'file', note: 'v1 import file: only @ lines' });
  } else if (claudeMd !== null) {
    items.push({ action: 'kept', path: V1_IMPORT_FILE, kind: 'file', note: 'not the v1 import file (has lines that are not @imports); left in place, check warns no-claude-md' });
  }
  for (const pointer of V1_POINTER_FILES) {
    const text = await readFileOnly(projectDir, pointer);
    if (text !== null && isV1PointerFile(text)) items.push({ action: 'deleted', path: pointer, kind: 'file', note: 'v1 pointer file: mentions agent-workflow' });
  }
  const removedDirs = [];
  for (const dir of V1_DIRECTORIES) {
    const found = await directoryEntries(projectDir, dir);
    if (found === null) continue;
    removedDirs.push(dir);
    items.push(...found);
  }
  const removedFiles = new Set(items.filter((item) => item.action === 'deleted').map((item) => item.path));
  const removed = (posixPath) => removedFiles.has(posixPath) || removedDirs.some((dir) => posixPath.startsWith(`${dir}/`));
  return { items, removed };
}

// Deletes what planV1Cleanup reported as deleted: files, links, then the v1 directories.
export async function applyV1Cleanup(projectDir, items) {
  for (const item of items) {
    if (item.action !== 'deleted') continue;
    const target = nativePath(projectDir, item.path.replace(/\/$/, ''));
    if (item.kind === 'directory') await rm(target, { recursive: true, force: true });
    else await rm(target, { force: true });
  }
}

async function readFileOnly(projectDir, posixPath) {
  const info = await lstatOrNull(nativePath(projectDir, posixPath));
  if (info === null || !info.isFile()) return null;
  return readTextIfExists(nativePath(projectDir, posixPath));
}

// The report items for one v1 directory: one per file and link inside it, then the directory itself;
// a link at the directory path is one item. null when nothing (or not a directory) is there.
async function directoryEntries(projectDir, dir) {
  const full = nativePath(projectDir, dir);
  const info = await lstatOrNull(full);
  if (info === null) return null;
  if (info.isSymbolicLink()) {
    const target = await readlink(full).catch(() => 'an unreadable target');
    return [{ action: 'deleted', path: `${dir}/`, kind: 'link', note: `v1 link to ${target}; the link only, its target is untouched` }];
  }
  if (!info.isDirectory()) return null;
  const inside = [];
  await collectEntries(full, dir, inside);
  return [...inside, { action: 'deleted', path: `${dir}/`, kind: 'directory', note: `v1 copy: the directory, with the ${inside.length} entr${inside.length === 1 ? 'y' : 'ies'} above` }];
}

async function collectEntries(fullDir, posixDir, found) {
  const entries = await readdir(fullDir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const posixPath = `${posixDir}/${entry.name}`;
    if (entry.isDirectory()) await collectEntries(path.join(fullDir, entry.name), posixPath, found);
    else if (entry.isSymbolicLink()) found.push({ action: 'deleted', path: posixPath, kind: 'link', note: 'v1 copy; a link, its target is untouched' });
    else found.push({ action: 'deleted', path: posixPath, kind: 'file', note: 'v1 copy' });
  }
}

async function lstatOrNull(full) {
  try {
    return await lstat(full);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}
