// `adopt`: installs the pack into a project that has no manifest yet.
import path from 'node:path';
import { contentHash, sameContent } from './hash.mjs';
import { nativePath, readBytesIfExists, writeBytes } from './files.mjs';
import { MANIFEST_PATH, manifestEntry, newManifest, readManifest, writeManifest } from './manifest.mjs';
import { loadPack, packSourcePath, readNextSteps, readPackBytes, renderForProject } from './pack.mjs';
import { utcDateString, utcTimestamp } from './dates.mjs';
import { WRITTEN_ACTIONS, commandResult, refuse, succeed } from './result.mjs';

// Pure decision for one pack file. existing is the project's current bytes or null.
export function decideAdoptItem(entry, bytes, existing, flags) {
  const item = { path: entry.path, policy: entry.policy, bytes };
  if (existing === null) return { ...item, action: 'create', sha256: contentHash(bytes) };
  if (sameContent(existing, bytes)) return { ...item, action: 'skip', sha256: contentHash(bytes) };
  if (entry.policy === 'owned' && flags.forceOwned) {
    return { ...item, action: 'kept', sha256: contentHash(existing), note: 'project file differs; kept' };
  }
  if (entry.policy === 'managed' && flags.forceManaged) {
    return { ...item, action: 'overwritten', sha256: contentHash(bytes), note: 'project file differed' };
  }
  return { ...item, action: 'conflict', sha256: null, note: 'project file differs from the template' };
}

export async function planAdopt({ projectDir, templateDir, pack, values, flags }) {
  const items = [];
  const errors = [];
  for (const entry of pack.files) {
    const source = await readPackBytes(templateDir, entry);
    if (source === null) {
      errors.push(`template file missing: ${packSourcePath(entry)}`);
      continue;
    }
    const bytes = renderForProject(entry, source, values);
    const existing = await readBytesIfExists(nativePath(projectDir, entry.path));
    items.push(decideAdoptItem(entry, bytes, existing, flags));
  }
  return { items, errors };
}

export function adoptManifest(items, { version, projectName, timestamp }) {
  const files = {};
  for (const item of items) files[item.path] = manifestEntry(item.policy, item.sha256);
  return newManifest({ version, projectName, adoptedAt: timestamp, syncedAt: timestamp, files });
}

// options: { projectDir, templateDir, name, harnessCli, now, forceOwned, forceManaged, dryRun }
export async function runAdopt(options) {
  const result = commandResult('adopt', options, { version: null, manifest: MANIFEST_PATH, items: [], nextSteps: null });
  const existing = await readManifest(options.projectDir);
  if (existing.exists) return refuse(result, `already adopted; use sync (${MANIFEST_PATH} exists)`);
  const pack = await loadPack(options.templateDir);
  if (!pack.ok) return refuse(result, ...pack.errors);
  result.version = pack.version;
  const values = { name: options.name ?? path.basename(options.projectDir), date: utcDateString(options.now), cli: options.harnessCli };
  const flags = { forceOwned: options.forceOwned, forceManaged: options.forceManaged };
  const plan = await planAdopt({ ...options, pack, values, flags });
  result.items = plan.items;
  if (plan.errors.length > 0) return refuse(result, ...plan.errors);
  const conflicts = plan.items.filter((item) => item.action === 'conflict');
  if (conflicts.length > 0) {
    return refuse(result, `refused: ${conflicts.length} conflict(s); nothing written. Use --force-owned or --force-managed.`);
  }
  if (!options.dryRun) {
    const manifest = adoptManifest(plan.items, { version: pack.version, projectName: values.name, timestamp: utcTimestamp(options.now) });
    await writeAdoption(options.projectDir, plan.items, manifest);
  }
  result.nextSteps = await readNextSteps(options.templateDir);
  return succeed(result);
}

async function writeAdoption(projectDir, items, manifest) {
  for (const item of items) {
    if (WRITTEN_ACTIONS.has(item.action)) await writeBytes(nativePath(projectDir, item.path), item.bytes);
  }
  await writeManifest(projectDir, manifest);
}
