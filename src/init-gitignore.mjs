// `init`: the lines of .gitignore.harness go into the project's .gitignore, and the harness file goes.
import { rm } from 'node:fs/promises';
import { nativePath, writeBytes } from './files.mjs';
import { joinLines, lineEnding, splitLines } from './text.mjs';

export const GITIGNORE_PATH = '.gitignore';
export const GITIGNORE_HARNESS_PATH = '.gitignore.harness';

// Returns { text, added: [lines] }: existingText (null when there is no .gitignore) with every non-blank
// line of harnessText that it lacks appended, in order. Lines compare trimmed.
export function mergeGitignore(existingText, harnessText) {
  const existingLines = existingText === null ? [] : splitLines(existingText);
  const present = new Set(existingLines.map((line) => line.trim()));
  const added = [];
  for (const line of splitLines(harnessText)) {
    const trimmed = line.trim();
    if (trimmed === '' || present.has(trimmed)) continue;
    present.add(trimmed);
    added.push(trimmed);
  }
  if (added.length === 0) return { text: existingText, added };
  const eol = existingText === null ? '\n' : lineEnding(existingText);
  return { text: joinLines([...existingLines, ...added], eol), added };
}

// existing is the project's .gitignore text or null. Returns report items: .gitignore created, updated or
// skipped, and .gitignore.harness deleted when it is in the project (harnessExists).
export function planGitignoreMerge(existing, harnessText, { harnessExists }) {
  const merged = mergeGitignore(existing, harnessText);
  const items = [];
  if (merged.added.length > 0) {
    const note = `added ${merged.added.length} line(s) from ${GITIGNORE_HARNESS_PATH}`;
    items.push({ action: existing === null ? 'create' : 'update', path: GITIGNORE_PATH, note, details: merged.added, bytes: Buffer.from(merged.text, 'utf8') });
  } else {
    items.push({ action: 'skip', path: GITIGNORE_PATH, note: `has every ${GITIGNORE_HARNESS_PATH} line`, bytes: null });
  }
  if (harnessExists) items.push({ action: 'deleted', path: GITIGNORE_HARNESS_PATH, note: 'merged into .gitignore', bytes: null });
  return items;
}

export async function applyGitignoreItems(projectDir, items) {
  for (const item of items) {
    if (item.path === GITIGNORE_PATH && item.bytes) await writeBytes(nativePath(projectDir, item.path), item.bytes);
    if (item.path === GITIGNORE_HARNESS_PATH && item.action === 'deleted') await rm(nativePath(projectDir, item.path), { force: true });
  }
}
