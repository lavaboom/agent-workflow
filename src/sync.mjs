// `sync`: brings managed files up to the current template and rewrites the manifest.
import path from 'node:path';
import { contentHash } from './hash.mjs';
import { deleteFile, nativePath, readBytesIfExists, writeBytes } from './files.mjs';
import { MANIFEST_PATH, manifestEntry, newManifest, readManifest, writeManifest } from './manifest.mjs';
import { loadPack, packSourcePath, readPackBytes, renderForProject } from './pack.mjs';
import { utcDateString, utcTimestamp } from './dates.mjs';
import { decideManaged, decideRetired, resolveConflict } from './sync-decide.mjs';
import { WRITTEN_ACTIONS, commandResult, refuse, succeed } from './result.mjs';

// options: { projectDir, templateDir, harnessCli, now, takeTemplate, keepLocal, prune, dryRun }
export async function runSync(options) {
  const result = commandResult('sync', options, { fromVersion: null, version: null, manifest: MANIFEST_PATH, manifestPlanned: false, items: [] });
  const current = await readManifest(options.projectDir);
  if (!current.exists) return refuse(result, `not adopted; use adopt (${MANIFEST_PATH} missing)`);
  if (!current.ok) return refuse(result, ...current.errors);
  const pack = await loadPack(options.templateDir);
  if (!pack.ok) return refuse(result, ...pack.errors);
  result.fromVersion = current.manifest.templateVersion ?? null;
  result.version = pack.version;
  const values = { name: current.manifest.projectName ?? path.basename(options.projectDir), date: utcDateString(options.now), cli: options.harnessCli };
  const plan = await planSync({ ...options, pack, recordedFiles: current.manifest.files, values });
  result.items = plan.items;
  if (plan.errors.length > 0) return refuse(result, ...plan.errors);
  result.manifestPlanned = true;
  if (!options.dryRun) {
    await applySync(options.projectDir, plan.items);
    const manifest = newManifest({
      version: pack.version,
      projectName: current.manifest.projectName ?? null,
      adoptedAt: current.manifest.adoptedAt ?? null,
      syncedAt: utcTimestamp(options.now),
      files: plan.files,
      vendored: current.manifest.vendored ?? null,
    });
    await writeManifest(options.projectDir, manifest);
  }
  const conflicts = plan.items.filter((item) => item.action === 'conflict').length;
  if (conflicts > 0) {
    result.errors.push(`${conflicts} conflict(s) left unresolved; rerun with --take-template or --keep-local`);
    return result;
  }
  return succeed(result);
}

export async function planSync({ projectDir, templateDir, pack, recordedFiles, values, takeTemplate, keepLocal, prune }) {
  const items = [];
  const errors = [];
  const files = {};
  for (const entry of pack.files) {
    const source = await readPackBytes(templateDir, entry);
    if (source === null) {
      errors.push(`template file missing: ${packSourcePath(entry)}`);
      continue;
    }
    const projectBytes = await readBytesIfExists(nativePath(projectDir, entry.path));
    const recorded = recordedFiles[entry.path];
    const planned = entry.policy === 'managed'
      ? planManaged(entry, source, projectBytes, recorded, { takeTemplate, keepLocal })
      : planOwned(entry, renderForProject(entry, source, values), projectBytes, recorded);
    items.push(planned.item);
    if (planned.record) files[entry.path] = planned.record;
  }
  const listed = new Set(pack.files.map((entry) => entry.path));
  for (const [filePath, recorded] of Object.entries(recordedFiles)) {
    if (listed.has(filePath)) continue;
    const projectBytes = await readBytesIfExists(nativePath(projectDir, filePath));
    const planned = planUnlisted(filePath, recorded, projectBytes, prune);
    items.push(planned.item);
    if (planned.record) files[filePath] = planned.record;
  }
  return { items, errors, files };
}

function planManaged(entry, templateBytes, projectBytes, recorded, flags) {
  const templateHash = contentHash(templateBytes);
  const projectHash = projectBytes === null ? null : contentHash(projectBytes);
  const decision = resolveConflict(decideManaged({ projectHash, templateHash, recorded }), flags);
  const item = { path: entry.path, policy: 'managed', action: decision.action, note: decision.note ?? null, bytes: templateBytes };
  if (decision.action === 'conflict') return { item, record: recorded ?? null };
  // A kept file records the project's bytes and the template bytes it was kept against.
  if (decision.action === 'kept') return { item, record: manifestEntry('managed', projectHash, templateHash) };
  return { item, record: manifestEntry('managed', templateHash) };
}

// An owned file is created only when it is new to the project: one the manifest records and the
// project has since deleted stays deleted (the project owns it; NEXT-STEPS.txt suggests removing some).
function planOwned(entry, renderedBytes, projectBytes, recorded) {
  if (projectBytes === null && recorded) {
    const item = { path: entry.path, policy: 'owned', action: 'skip', note: 'deleted by the project; not recreated', bytes: null };
    return { item, record: manifestEntry('owned', recorded.sha256) };
  }
  if (projectBytes === null) {
    const item = { path: entry.path, policy: 'owned', action: 'create', note: null, bytes: renderedBytes };
    return { item, record: manifestEntry('owned', contentHash(renderedBytes)) };
  }
  const item = { path: entry.path, policy: 'owned', action: 'skip', note: 'owned by the project', bytes: null };
  const record = recorded && recorded.policy === 'owned' ? recorded : manifestEntry('owned', contentHash(projectBytes));
  return { item, record };
}

function planUnlisted(filePath, recorded, projectBytes, prune) {
  if (recorded.policy !== 'managed') {
    const note = 'no longer in the template; left in place and dropped from the manifest';
    return { item: { path: filePath, policy: recorded.policy, action: 'untracked', note, bytes: null }, record: null };
  }
  const projectHash = projectBytes === null ? null : contentHash(projectBytes);
  const decision = decideRetired({ projectHash, recorded, prune });
  const item = { path: filePath, policy: 'managed', action: decision.action, note: decision.note, bytes: null };
  return { item, record: decision.keepEntry ? recorded : null };
}

async function applySync(projectDir, items) {
  for (const item of items) {
    const target = nativePath(projectDir, item.path);
    if (WRITTEN_ACTIONS.has(item.action)) await writeBytes(target, item.bytes);
    if (item.action === 'pruned') await deleteFile(target);
  }
}
