// `init` on a project with no manifest: v1 cleanup, the entry file move, adopt with init's conflict policy
// (owned files kept, managed files replaced with a backup), the settings, the board lines, .gitignore.
import path from 'node:path';
import { planAdopt, projectReader } from './adopt.mjs';
import { BOARD_PATH, ensureBoardLines } from './init-board.mjs';
import { ENTRY_PATH, GUIDE_PATH, guideText } from './init-entry.mjs';
import { GITIGNORE_HARNESS_PATH, GITIGNORE_PATH, applyGitignoreItems, planGitignoreMerge } from './init-gitignore.mjs';
import { fillEntryFile, parseWorkflowSettings, projectSetting } from './init-settings.mjs';
import { applyV1Cleanup, planV1Cleanup } from './init-v1.mjs';
import { contentHash, sameContent } from './hash.mjs';
import { deleteFile, nativePath, writeBytes } from './files.mjs';
import { utcDateString } from './dates.mjs';
import { WRITTEN_ACTIONS } from './result.mjs';
import { decodeUtf8 } from './text.mjs';

export const BACKUP_DIR = 'docs/harness/init-backup';
const INIT_FLAGS = { forceOwned: true, forceManaged: true };

// The text of a project file init rewrites. Bytes that are not valid UTF-8 refuse the run: a rewrite
// through a string would change them.
export function projectText(errors, posixPath, bytes) {
  const text = decodeUtf8(bytes);
  if (text === null) errors.push(`${posixPath} is not valid UTF-8, and init rewrites it; fix its encoding, then run init again`);
  return text ?? '';
}

// Returns { items (report order), manifestItems, settings, projectName, entry, cleanupItems, errors }.
export async function planInitAdopt(options, pack) {
  const read = projectReader(options.projectDir);
  const date = utcDateString(options.now);
  const errors = [];
  const cleanup = await planV1Cleanup(options.projectDir);
  const entry = await planEntryMove(read, date, errors);
  const projectName = options.name ?? projectSetting(entry.settings) ?? path.basename(options.projectDir);
  const values = { name: projectName, date, cli: options.harnessCli };
  const readExisting = (posixPath) => (cleanup.removed(posixPath) || (entry.item && posixPath === ENTRY_PATH) ? null : read(posixPath));
  const adopt = await planAdopt({ ...options, pack, values, flags: INIT_FLAGS, readExisting });
  errors.push(...adopt.errors);
  const plan = { items: [...cleanup.items], manifestItems: [], settings: [], projectName, entry, cleanupItems: cleanup.items, errors };
  if (entry.item) plan.items.push(entry.item);
  for (const item of adopt.items) await planPackItem(plan, item, { read, readExisting });
  return plan;
}

async function planEntryMove(read, date, errors) {
  const bytes = await read(ENTRY_PATH);
  if (bytes === null) return { item: null, found: false, settings: [] };
  if ((await read(GUIDE_PATH)) !== null) {
    errors.push(`${GUIDE_PATH} already exists and init moves AGENTS.md there; move or merge it by hand, then run init again`);
  }
  const text = projectText(errors, ENTRY_PATH, bytes);
  const parsed = parseWorkflowSettings(text);
  const guide = guideText(text, date);
  const notes = [
    `to ${GUIDE_PATH}`,
    guide.droppedParagraphs > 0 ? `${guide.droppedParagraphs} v1 pointer paragraph(s) dropped` : 'no v1 pointer paragraph',
    parsed.found ? `${parsed.settings.length} Workflow settings read` : 'no Workflow settings table',
  ];
  const item = { action: 'moved', path: ENTRY_PATH, to: GUIDE_PATH, note: notes.join('; '), bytes: Buffer.from(guide.text, 'utf8') };
  return { item, found: parsed.found, settings: parsed.settings };
}

async function planPackItem(plan, item, { read, readExisting }) {
  if (item.action === 'overwritten') return planReplaced(plan, item, { read, readExisting });
  if (item.path === ENTRY_PATH && item.action === 'create' && plan.entry.found) return planFilledEntry(plan, item);
  if (item.path === BOARD_PATH && item.action === 'kept') return planBoard(plan, item, readExisting);
  if (item.path === GITIGNORE_HARNESS_PATH) return planGitignore(plan, item, readExisting);
  plan.items.push(item);
  plan.manifestItems.push({ path: item.path, policy: item.policy, sha256: item.sha256 });
}

async function planReplaced(plan, item, { read, readExisting }) {
  const old = await readExisting(item.path);
  const backup = `${BACKUP_DIR}/${item.path}`;
  const existingBackup = await read(backup);
  if (existingBackup !== null && !sameContent(existingBackup, old)) {
    plan.errors.push(`${backup} already exists and differs from the project's ${item.path}; move it away, then run init again`);
  }
  plan.items.push({ ...item, action: 'replaced', note: `old copy in ${backup}` });
  plan.items.push({ action: 'backup', path: backup, policy: null, note: `the project's ${item.path} before init`, bytes: old });
  plan.manifestItems.push({ path: item.path, policy: item.policy, sha256: item.sha256 });
}

function planFilledEntry(plan, item) {
  const filled = fillEntryFile(item.bytes.toString('utf8'), plan.entry.settings, plan.projectName);
  const bytes = Buffer.from(filled.text, 'utf8');
  plan.items.push({ ...item, bytes, sha256: contentHash(bytes) });
  const details = filled.filled.map((setting) => `${setting.name} = ${setting.value}`);
  if (filled.builderChecks !== null) details.push(`Builder checks -> a comment under the tier table: ${filled.builderChecks}`);
  if (filled.unmatched.length > 0) details.push(`not carried over (no v2 row; still in ${GUIDE_PATH}): ${filled.unmatched.join(', ')}`);
  plan.items.push({ action: 'filled', path: ENTRY_PATH, policy: null, note: `${filled.filled.length} settings from the old Workflow settings table`, details, bytes: null });
  plan.settings = filled.filled;
  plan.manifestItems.push({ path: item.path, policy: item.policy, sha256: contentHash(bytes) });
}

async function planBoard(plan, item, readExisting) {
  const board = ensureBoardLines(projectText(plan.errors, item.path, await readExisting(item.path)));
  if (board.added.length === 0) {
    plan.items.push(item);
  } else {
    const bytes = Buffer.from(board.text, 'utf8');
    const labels = board.added.map((label) => `"${label}"`).join(' and ');
    plan.items.push({ ...item, bytes, write: true, sha256: contentHash(bytes), note: `project file kept; inserted ${labels} after the first heading` });
  }
  plan.manifestItems.push({ path: item.path, policy: item.policy, sha256: plan.items[plan.items.length - 1].sha256 });
}

// .gitignore.harness is never left in the project: its lines go into .gitignore. Its manifest record
// stays, so that sync treats it as an owned file the project deleted and does not recreate it.
async function planGitignore(plan, item, readExisting) {
  const existed = item.action !== 'create';
  const harnessBytes = item.action === 'kept' ? await readExisting(item.path) : item.bytes;
  const gitignoreBytes = await readExisting(GITIGNORE_PATH);
  const gitignore = gitignoreBytes === null ? null : projectText(plan.errors, GITIGNORE_PATH, gitignoreBytes);
  const harness = projectText(plan.errors, item.path, harnessBytes);
  plan.items.push(...planGitignoreMerge(gitignore, harness, { harnessExists: existed }));
  plan.manifestItems.push({ path: item.path, policy: item.policy, sha256: contentHash(harnessBytes) });
}

// Writes in an order that never loses content: backups and the guide first, then deletions, then the
// pack files, then .gitignore. The manifest is the caller's last write.
export async function applyInitAdopt(projectDir, plan) {
  for (const item of plan.items.filter((entry) => entry.action === 'backup')) await writeBytes(nativePath(projectDir, item.path), item.bytes);
  if (plan.entry.item) {
    await writeBytes(nativePath(projectDir, GUIDE_PATH), plan.entry.item.bytes);
    await deleteFile(nativePath(projectDir, ENTRY_PATH));
  }
  await applyV1Cleanup(projectDir, plan.cleanupItems);
  for (const item of plan.items) {
    if (!item.policy) continue;
    if (WRITTEN_ACTIONS.has(item.action) || item.action === 'replaced' || item.write) await writeBytes(nativePath(projectDir, item.path), item.bytes);
  }
  await applyGitignoreItems(projectDir, plan.items);
}
