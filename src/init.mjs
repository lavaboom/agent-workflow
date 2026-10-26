// `init`: one idempotent command for a project. Not adopted: migrate from v1 and adopt (init-adopt.mjs).
// Adopted: sync with default options, then the .gitignore merge. Never commits; prints the git command.
import { adoptManifest, printableText, projectReader } from './adopt.mjs';
import { applyInitAdopt, planInitAdopt, projectText } from './init-adopt.mjs';
import { GUIDE_PATH } from './init-entry.mjs';
import { GITIGNORE_HARNESS_PATH, GITIGNORE_PATH, applyGitignoreItems, planGitignoreMerge } from './init-gitignore.mjs';
import { V1_IMPORT_FILE, V1_POINTER_FILES } from './init-v1.mjs';
import { MANIFEST_PATH, readManifest, writeManifest } from './manifest.mjs';
import { loadPack, readNextSteps, readPackBytes } from './pack.mjs';
import { utcTimestamp } from './dates.mjs';
import { commandResult, refuse, succeed } from './result.mjs';
import { runSync } from './sync.mjs';

const ADOPT_PATHS = ['AGENTS.md', '.claude', '.agents', '.codex', 'docs', 'ecc-install.json', 'fresh-init.cmd', '.gitignore'];
// Deleted v1 files outside those paths' reach for `git add -A` to stage (named as the spec names them).
const STAGED_DELETIONS = [V1_IMPORT_FILE, V1_POINTER_FILES[0]];
const SYNC_CHANGES = new Set(['create', 'update', 'overwritten', 'pruned']);
const GUIDE_STEP = `${GUIDE_PATH} holds the old AGENTS.md: split its rules into .claude/rules/ and docs/, then trim it`;

// options: { projectDir, templateDir, name, harnessCli, now, dryRun }
export async function runInit(options) {
  const current = await readManifest(options.projectDir);
  return current.exists ? initSync(options) : initAdopt(options);
}

async function initAdopt(options) {
  const result = commandResult('init', options, {
    mode: 'adopt', version: null, projectName: null, manifest: MANIFEST_PATH, items: [], settings: [], nextSteps: null, gitCommand: null,
  });
  const pack = await loadPack(options.templateDir);
  if (!pack.ok) return refuse(result, ...pack.errors);
  result.version = pack.version;
  const plan = await planInitAdopt(options, pack);
  Object.assign(result, { items: plan.items, settings: plan.settings, projectName: plan.projectName });
  if (plan.errors.length > 0) return refuse(result, ...plan.errors, 'refused: nothing written');
  if (!options.dryRun) {
    await applyInitAdopt(options.projectDir, plan);
    const timestamp = utcTimestamp(options.now);
    await writeManifest(options.projectDir, adoptManifest(plan.manifestItems, { version: pack.version, projectName: plan.projectName, timestamp }));
  }
  result.nextSteps = initNextSteps(await readNextSteps(options.templateDir), plan.entry.item !== null);
  const deleted = new Set(plan.items.filter((item) => item.action === 'deleted').map((item) => item.path));
  result.gitCommand = adoptGitCommand(pack.version, STAGED_DELETIONS.filter((file) => deleted.has(file)));
  return succeed(result);
}

async function initSync(options) {
  const sync = await runSync({ ...options, takeTemplate: false, keepLocal: false, prune: false });
  const result = { ...sync, command: 'init', mode: 'sync', gitCommand: null };
  if (!sync.manifestPlanned) return result;
  const errors = [];
  const gitignoreItems = await planSyncGitignore(options, sync.items, errors);
  if (errors.length > 0) return refuse({ ...result, ok: false, exitCode: 1, errors: [...sync.errors] }, ...errors, 'the .gitignore merge was not done');
  if (!options.dryRun) await applyGitignoreItems(options.projectDir, gitignoreItems);
  result.items = [...sync.items, ...gitignoreItems];
  // The exact paths, never a directory: a sync must not sweep the project's own uncommitted work into its commit.
  const changedPaths = [...sync.items.filter((item) => SYNC_CHANGES.has(item.action)), ...gitignoreItems.filter((item) => item.action !== 'skip')]
    .map((item) => item.path);
  const changed = sync.fromVersion !== sync.version || changedPaths.length > 0;
  if (changed) result.gitCommand = syncGitCommand(sync.version, [...changedPaths, MANIFEST_PATH]);
  return result;
}

// The lines come from the template's .gitignore.harness and from the project's copy, when it has one
// (sync creates it for a project adopted before it was in the pack).
async function planSyncGitignore(options, syncItems, errors) {
  const pack = await loadPack(options.templateDir);
  const entry = pack.files.find((file) => file.path === GITIGNORE_HARNESS_PATH);
  const templateBytes = entry ? await readPackBytes(options.templateDir, entry) : null;
  const read = projectReader(options.projectDir);
  const projectBytes = await read(GITIGNORE_HARNESS_PATH);
  const createdBySync = syncItems.some((item) => item.path === GITIGNORE_HARNESS_PATH && item.action === 'create');
  if (templateBytes === null && projectBytes === null) return [];
  const harness = [templateBytes, projectBytes].filter((bytes) => bytes !== null)
    .map((bytes) => projectText(errors, GITIGNORE_HARNESS_PATH, bytes)).join('\n');
  const gitignoreBytes = await read(GITIGNORE_PATH);
  const gitignore = gitignoreBytes === null ? null : projectText(errors, GITIGNORE_PATH, gitignoreBytes);
  return planGitignoreMerge(gitignore, harness, { harnessExists: projectBytes !== null || createdBySync });
}

// NEXT-STEPS.txt as adopt prints it, with step 0 before step 1 when docs/project-guide.md was written.
export function initNextSteps(text, guideWritten) {
  const printable = printableText(text);
  if (!guideWritten) return printable;
  if (printable === null) return `0. ${GUIDE_STEP}`;
  const lines = printable.split('\n');
  const first = lines.findIndex((line) => /^\s*1\.\s/.test(line));
  const indent = first < 0 ? '' : /^\s*/.exec(lines[first])[0];
  lines.splice(first < 0 ? 0 : first, 0, `${indent}0. ${GUIDE_STEP}`);
  return lines.join('\n');
}

export function adoptGitCommand(version, deletedFiles) {
  const paths = [...ADOPT_PATHS, ...deletedFiles].join(' ');
  return `git add -A -- ${paths} && git commit -m "docs(harness): adopt agent-workflow v${version}"`;
}

export function syncGitCommand(version, paths) {
  return `git add -- ${paths.join(' ')} && git commit -m "docs(harness): sync agent-workflow v${version}"`;
}
