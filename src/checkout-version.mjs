// The version of a vendoring checkout, read without shelling out: the tag that points exactly at HEAD
// (loose refs, packed-refs, and loose annotated tag objects), else the VERSION file, else package.json's
// "version", else "unknown". A HEAD between tags is not described (no "v1.2-3-gabc"); the fallbacks apply.
import { inflateSync } from 'node:zlib';
import path from 'node:path';
import { isDirectory, listFilesRecursive, readBytesIfExists, readTextIfExists } from './files.mjs';
import { splitLines, stripBom } from './text.mjs';
import { compareVersions } from './versions.mjs';

const SHA = /^[0-9a-f]{40}$/;

export async function readCheckoutVersion(checkoutDir) {
  const tag = await exactTag(path.join(checkoutDir, '.git'));
  if (tag) return { version: tag, via: 'git tag' };
  const versionFile = await readTextIfExists(path.join(checkoutDir, 'VERSION'));
  const firstLine = versionFile === null ? '' : (splitLines(versionFile)[0] ?? '').trim();
  if (firstLine !== '') return { version: firstLine, via: 'VERSION' };
  const packageVersion = await readPackageVersion(path.join(checkoutDir, 'package.json'));
  if (packageVersion) return { version: packageVersion, via: 'package.json' };
  return { version: 'unknown', via: 'none' };
}

async function exactTag(gitDir) {
  if (!(await isDirectory(gitDir))) return null;
  const head = (await readTextIfExists(path.join(gitDir, 'HEAD')))?.trim() ?? '';
  const packed = parsePackedRefs(await readTextIfExists(path.join(gitDir, 'packed-refs')));
  const commit = head.startsWith('ref: ') ? await resolveRef(gitDir, head.slice(5).trim(), packed) : head;
  if (!SHA.test(commit ?? '')) return null;
  const names = [];
  for (const tag of await listTags(gitDir, packed)) {
    if (tag.sha === commit || tag.peeled === commit || (await peelLooseTag(gitDir, tag.sha)) === commit) names.push(tag.name);
  }
  return names.sort((a, b) => compareVersions(b, a))[0] ?? null;
}

// packed-refs: "<sha> <ref>" lines, each optionally followed by "^<peeled sha>" for an annotated tag.
export function parsePackedRefs(text) {
  const refs = [];
  for (const line of text === null ? [] : splitLines(text)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('^') && refs.length > 0) refs[refs.length - 1].peeled = trimmed.slice(1);
    const match = /^([0-9a-f]{40})\s+(\S+)$/.exec(trimmed);
    if (match) refs.push({ sha: match[1], ref: match[2], peeled: null });
  }
  return refs;
}

async function resolveRef(gitDir, ref, packed) {
  const loose = await readTextIfExists(path.join(gitDir, ...ref.split('/')));
  if (loose !== null) return loose.trim();
  return packed.find((entry) => entry.ref === ref)?.sha ?? null;
}

async function listTags(gitDir, packed) {
  const tags = packed.filter((entry) => entry.ref.startsWith('refs/tags/'))
    .map((entry) => ({ name: entry.ref.slice('refs/tags/'.length), sha: entry.sha, peeled: entry.peeled }));
  const tagsDir = path.join(gitDir, 'refs', 'tags');
  for (const name of await listFilesRecursive(tagsDir)) {
    const sha = (await readTextIfExists(path.join(tagsDir, ...name.split('/'))))?.trim() ?? '';
    if (SHA.test(sha)) tags.push({ name, sha, peeled: null });
  }
  return tags;
}

// A loose annotated tag object inflates to "tag <size>\0object <sha>\n...". Packed objects are not read.
async function peelLooseTag(gitDir, sha) {
  const bytes = await readBytesIfExists(path.join(gitDir, 'objects', sha.slice(0, 2), sha.slice(2)));
  if (bytes === null) return null;
  let text;
  try {
    text = inflateSync(bytes).toString('utf8');
  } catch {
    return null;
  }
  const match = /^tag \d+\0object ([0-9a-f]{40})\n/.exec(text);
  return match ? match[1] : null;
}

async function readPackageVersion(file) {
  const text = await readTextIfExists(file);
  if (text === null) return null;
  try {
    const version = JSON.parse(stripBom(text)).version;
    return typeof version === 'string' && version.trim() !== '' ? version.trim() : null;
  } catch {
    return null;
  }
}
