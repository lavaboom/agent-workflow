// File-system access with explicit inputs: every pack path is POSIX-style and converted here.
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Converts a forward-slash path relative to rootDir into a native absolute path.
export function nativePath(rootDir, posixRelative) {
  return path.join(rootDir, ...posixRelative.split('/'));
}

export async function readBytesIfExists(file) {
  try {
    return await readFile(file);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

export async function readTextIfExists(file) {
  const bytes = await readBytesIfExists(file);
  return bytes === null ? null : bytes.toString('utf8');
}

export async function writeBytes(file, bytes) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

// Writes <file>.tmp in the same directory, then renames it over file: readers see the old or the new
// content, never a partial write. The temporary file is removed when the rename fails.
export async function writeBytesAtomic(file, bytes) {
  const temporary = `${file}.tmp`;
  await writeBytes(temporary, bytes);
  try {
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

export async function isDirectory(dir) {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

export async function deleteFile(file) {
  await unlink(file);
}

// Every file under rootDir as a sorted list of forward-slash relative paths; [] when rootDir is absent.
export async function listFilesRecursive(rootDir) {
  const found = [];
  await collectFiles(rootDir, '', found);
  return found.sort();
}

async function collectFiles(rootDir, prefix, found) {
  let entries;
  try {
    entries = await readdir(path.join(rootDir, ...splitPrefix(prefix)), { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return;
    throw error;
  }
  for (const entry of entries) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) await collectFiles(rootDir, relative, found);
    else if (entry.isFile()) found.push(relative);
  }
}

function splitPrefix(prefix) {
  return prefix === '' ? [] : prefix.split('/');
}
