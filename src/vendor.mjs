// `vendor`: copies single skills, agents, rules or hooks from a local checkout into .claude/ and records
// their provenance and hashes in the manifest's `vendored` object.
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { contentHash, sameContent } from './hash.mjs';
import { listFilesRecursive, nativePath, readBytesIfExists, writeBytes } from './files.mjs';
import { MANIFEST_PATH, readManifest, writeManifest } from './manifest.mjs';
import { readCheckoutVersion } from './checkout-version.mjs';
import { utcTimestamp } from './dates.mjs';
import { WRITTEN_ACTIONS, commandResult, refuse, succeed } from './result.mjs';

export const VENDOR_PREFIXES = ['skills/', 'agents/', 'rules/', 'hooks/'];

// Returns null for a vendorable item path, else the reason it is refused. Items use forward slashes.
export function vendorItemProblem(item) {
  if (item === '' || item.startsWith('/') || item.includes(':') || item.split('/').some((s) => s === '' || s === '.' || s === '..')) {
    return `"${item}" is not a relative path inside the checkout`;
  }
  if (!VENDOR_PREFIXES.some((prefix) => item.startsWith(prefix))) {
    return `"${item}" is not under ${VENDOR_PREFIXES.join(', ')}; only those are vendored`;
  }
  return null;
}

// rules/<lang>/<file>.md flattens to .claude/rules/<lang>-<file>.md; everything else keeps its path under .claude/.
export function destinationFor(item, isDirectoryItem) {
  const rule = /^rules\/([^/]+)\/([^/]+\.md)$/.exec(item);
  if (!isDirectoryItem && rule) return `.claude/rules/${rule[1]}-${rule[2]}`;
  return `.claude/${item}`;
}

// options: { projectDir, from, items, now, force, dryRun }
export async function runVendor(options) {
  const result = commandResult('vendor', options, { manifest: MANIFEST_PATH, from: null, version: null, items: [], vendored: {} });
  const current = await readManifest(options.projectDir);
  if (!current.exists) return refuse(result, `not adopted; use adopt (${MANIFEST_PATH} missing)`);
  if (!current.ok) return refuse(result, ...current.errors);
  const checkout = path.resolve(options.from);
  result.from = checkout;
  const { version } = await readCheckoutVersion(checkout);
  result.version = version;
  const plan = await planVendor({ projectDir: options.projectDir, checkout, items: options.items, force: options.force });
  result.items = plan.files;
  if (plan.errors.length > 0) return refuse(result, ...plan.errors);
  const conflicts = plan.files.filter((file) => file.action === 'conflict').length;
  if (conflicts > 0) return refuse(result, `refused: ${conflicts} destination(s) differ; nothing written. Use --force to overwrite.`);
  const vendoredAt = utcTimestamp(options.now);
  for (const entry of plan.entries) {
    result.vendored[entry.destination] = provenance(entry, { checkout, version, vendoredAt });
  }
  if (!options.dryRun) {
    for (const file of plan.files) {
      if (WRITTEN_ACTIONS.has(file.action)) await writeBytes(nativePath(options.projectDir, file.path), file.bytes);
    }
    const vendored = { ...(current.manifest.vendored ?? {}), ...result.vendored };
    await writeManifest(options.projectDir, { ...current.manifest, vendored });
  }
  return succeed(result);
}

export async function planVendor({ projectDir, checkout, items, force }) {
  const files = [];
  const entries = [];
  const errors = [];
  const seen = new Set();
  for (const item of items) {
    const sources = await itemSources(checkout, item);
    if (sources === null) {
      errors.push(`${item} not found in ${checkout}`);
      continue;
    }
    const entry = { item, destination: destinationFor(item, sources.isDirectory), isDirectory: sources.isDirectory, hashes: {} };
    for (const relative of sources.files) {
      const destination = sources.isDirectory ? `${entry.destination}/${relative}` : entry.destination;
      if (seen.has(destination)) errors.push(`${destination} would be written twice`);
      seen.add(destination);
      const bytes = await readBytesIfExists(nativePath(checkout, sources.isDirectory ? `${item}/${relative}` : item));
      const existing = await readBytesIfExists(nativePath(projectDir, destination));
      files.push({ path: destination, source: item, bytes, ...decideVendorFile(bytes, existing, force) });
      entry.hashes[sources.isDirectory ? relative : path.posix.basename(destination)] = contentHash(bytes);
    }
    entries.push(entry);
  }
  return { files, entries, errors };
}

export function decideVendorFile(bytes, existing, force) {
  if (existing === null) return { action: 'create', note: null };
  if (sameContent(existing, bytes)) return { action: 'skip', note: 'identical' };
  if (force) return { action: 'overwritten', note: 'destination differed' };
  return { action: 'conflict', note: 'destination exists and differs' };
}

// { isDirectory, files } with files relative to the item (a file item lists itself as ''), or null.
async function itemSources(checkout, item) {
  let info;
  try {
    info = await stat(nativePath(checkout, item));
  } catch {
    return null;
  }
  if (info.isFile()) return { isDirectory: false, files: [''] };
  if (!info.isDirectory()) return null;
  const files = await listFilesRecursive(nativePath(checkout, item));
  return files.length > 0 ? { isDirectory: true, files } : null;
}

function provenance(entry, { checkout, version, vendoredAt }) {
  return {
    from: checkout,
    source: entry.item,
    version,
    vendoredAt,
    kind: entry.isDirectory ? 'directory' : 'file',
    sha256: entry.hashes,
  };
}

// The project files a vendored entry covers, with their recorded hashes.
export function vendoredFiles(destination, record) {
  const hashes = record && typeof record.sha256 === 'object' && record.sha256 !== null ? record.sha256 : {};
  return Object.entries(hashes).map(([relative, sha256]) => ({
    path: record.kind === 'file' ? destination : `${destination}/${relative}`,
    sha256,
  }));
}
