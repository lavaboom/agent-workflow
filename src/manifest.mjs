// The project manifest, docs/harness/manifest.json: template version, project name, timestamps, one hash
// per pack file, and the provenance of vendored files.
import { nativePath, readTextIfExists, writeBytesAtomic } from './files.mjs';
import { manifestErrors } from './manifest-validate.mjs';
import { stripBom } from './text.mjs';

export const MANIFEST_PATH = 'docs/harness/manifest.json';

export function manifestFile(projectDir) {
  return nativePath(projectDir, MANIFEST_PATH);
}

// Returns { exists, ok, manifest, errors }. A manifest with any invalid part is not ok as a whole.
export async function readManifest(projectDir) {
  const text = await readTextIfExists(manifestFile(projectDir));
  if (text === null) return { exists: false, ok: false, manifest: null, errors: [] };
  let data;
  try {
    data = JSON.parse(stripBom(text));
  } catch (error) {
    return { exists: true, ok: false, manifest: null, errors: [`${MANIFEST_PATH} is not valid JSON: ${error.message}`] };
  }
  const errors = manifestErrors(data).map((message) => `${MANIFEST_PATH}: ${message}`);
  if (errors.length > 0) return { exists: true, ok: false, manifest: null, errors };
  return { exists: true, ok: true, manifest: data, errors: [] };
}

// Written to a temporary file and renamed over the manifest, so a crash never leaves it truncated.
export async function writeManifest(projectDir, manifest) {
  await writeBytesAtomic(manifestFile(projectDir), Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'));
}

// One manifest record. templateSha256 is stored only when the project keeps a local version of a
// managed file, so that a later sync can tell "kept on purpose" from "template changed".
export function manifestEntry(policy, sha256, templateSha256 = null) {
  const entry = { policy, sha256 };
  if (templateSha256 !== null && templateSha256 !== sha256) entry.templateSha256 = templateSha256;
  return entry;
}

// projectName is the --name given at adopt (it fills {{PROJECT}} in owned files sync creates later);
// vendored (written by `vendor`) is carried over unchanged. Both are omitted when null.
export function newManifest({ version, projectName = null, adoptedAt, syncedAt, files, vendored = null }) {
  const manifest = { templateVersion: version };
  if (projectName !== null) manifest.projectName = projectName;
  Object.assign(manifest, { adoptedAt, syncedAt, files });
  if (vendored !== null) manifest.vendored = vendored;
  return manifest;
}
