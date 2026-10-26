// Shape checks for docs/harness/manifest.json. Every path the manifest names is later joined to the project
// directory (read, written, or deleted by `sync --prune`), so each must be a safe relative path.
import { POLICIES, isSafeRelativePath } from './pack.mjs';

const SHA256 = /^[0-9a-f]{64}$/;
const VENDORED_KINDS = ['file', 'directory'];

// Returns a list of error messages; [] when the manifest is usable.
export function manifestErrors(data) {
  if (!isPlainObject(data)) return ['must hold an object'];
  const errors = [];
  if (data.templateVersion !== undefined && typeof data.templateVersion !== 'string') errors.push('"templateVersion" must be a string');
  if (data.projectName !== undefined && (typeof data.projectName !== 'string' || data.projectName.trim() === '')) {
    errors.push('"projectName" must be a non-empty string');
  }
  if (!isPlainObject(data.files)) return [...errors, 'has no "files" object'];
  for (const [key, entry] of Object.entries(data.files)) errors.push(...fileEntryErrors(key, entry));
  if (data.vendored !== undefined) {
    if (!isPlainObject(data.vendored)) errors.push('"vendored" must be an object');
    else for (const [key, entry] of Object.entries(data.vendored)) errors.push(...vendoredEntryErrors(key, entry));
  }
  return errors;
}

function fileEntryErrors(key, entry) {
  const where = `files["${key}"]`;
  if (!isSafeRelativePath(key)) return [`${where}: the key is not a safe relative path`];
  if (!isPlainObject(entry)) return [`${where} must be an object`];
  const errors = [];
  if (!POLICIES.includes(entry.policy)) errors.push(`${where}: "policy" must be managed or owned`);
  if (!isSha256(entry.sha256)) errors.push(`${where}: "sha256" must be a sha256 hex string`);
  if (entry.templateSha256 !== undefined && !isSha256(entry.templateSha256)) errors.push(`${where}: "templateSha256" must be a sha256 hex string`);
  return errors;
}

function vendoredEntryErrors(key, entry) {
  const where = `vendored["${key}"]`;
  if (!isSafeRelativePath(key)) return [`${where}: the key is not a safe relative path`];
  if (!isPlainObject(entry)) return [`${where} must be an object`];
  const errors = [];
  if (!VENDORED_KINDS.includes(entry.kind)) errors.push(`${where}: "kind" must be file or directory`);
  if (!isPlainObject(entry.sha256)) return [...errors, `${where}: "sha256" must be an object`];
  for (const [relative, hash] of Object.entries(entry.sha256)) {
    if (!isSafeRelativePath(relative)) errors.push(`${where}.sha256["${relative}"]: the key is not a safe relative path`);
    else if (!isSha256(hash)) errors.push(`${where}.sha256["${relative}"] must be a sha256 hex string`);
  }
  return errors;
}

function isSha256(value) {
  return typeof value === 'string' && SHA256.test(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
