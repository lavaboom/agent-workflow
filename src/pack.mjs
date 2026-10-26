// The template pack: loads and validates template.json, reads pack file bytes, renders owned files.
import path from 'node:path';
import { nativePath, readBytesIfExists, readTextIfExists } from './files.mjs';
import { stripBom } from './text.mjs';

export const PACK_MANIFEST = 'template.json';
export const NEXT_STEPS = 'NEXT-STEPS.txt';
// Files at the template root that describe the pack and are not part of it.
export const PACK_METADATA = [PACK_MANIFEST, NEXT_STEPS];
export const POLICIES = ['managed', 'owned'];

export async function loadPack(templateDir) {
  const text = await readTextIfExists(path.join(templateDir, PACK_MANIFEST));
  if (text === null) return failedPack(`${PACK_MANIFEST} not found in ${templateDir}`);
  let data;
  try {
    data = JSON.parse(stripBom(text));
  } catch (error) {
    return failedPack(`${PACK_MANIFEST} is not valid JSON: ${error.message}`);
  }
  return validatePack(data);
}

export function validatePack(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return failedPack(`${PACK_MANIFEST} must hold an object`);
  }
  const errors = [];
  if (typeof data.version !== 'string' || data.version.trim() === '') {
    errors.push(`${PACK_MANIFEST}: "version" must be a non-empty string`);
  }
  if (!Array.isArray(data.files)) {
    errors.push(`${PACK_MANIFEST}: "files" must be an array`);
    return { ok: false, version: data.version ?? null, files: [], errors };
  }
  const files = [];
  const seen = new Set();
  data.files.forEach((entry, index) => {
    const entryErrors = validateEntry(entry, index);
    if (entryErrors.length > 0) {
      errors.push(...entryErrors);
      return;
    }
    if (seen.has(entry.path)) errors.push(`${PACK_MANIFEST}: "${entry.path}" is listed twice`);
    seen.add(entry.path);
    files.push({ path: entry.path, policy: entry.policy, from: entry.from ?? null });
  });
  return { ok: errors.length === 0, version: data.version ?? null, files, errors };
}

function validateEntry(entry, index) {
  const where = `${PACK_MANIFEST}: files[${index}]`;
  if (entry === null || typeof entry !== 'object') return [`${where} must be an object`];
  const errors = [];
  if (!isSafeRelativePath(entry.path)) errors.push(`${where}: bad "path" ${JSON.stringify(entry.path)}`);
  if (!POLICIES.includes(entry.policy)) errors.push(`${where}: "policy" must be managed or owned`);
  if (entry.from !== undefined && !isSafeRelativePath(entry.from)) {
    errors.push(`${where}: bad "from" ${JSON.stringify(entry.from)}`);
  }
  return errors;
}

// A pack path is relative, uses forward slashes, and never climbs out of its root.
export function isSafeRelativePath(value) {
  if (typeof value !== 'string' || value === '') return false;
  if (value.includes('\\') || value.includes(':') || value.startsWith('/')) return false;
  return value.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

export function packSourcePath(entry) {
  return entry.from ?? entry.path;
}

export async function readPackBytes(templateDir, entry) {
  return readBytesIfExists(nativePath(templateDir, packSourcePath(entry)));
}

export async function readNextSteps(templateDir) {
  return readTextIfExists(path.join(templateDir, NEXT_STEPS));
}

// values: { name, date, cli }. {{HARNESS_CLI}} is the command that runs the adopting CLI.
export function substitutePlaceholders(text, values) {
  return text.split('{{PROJECT}}').join(values.name)
    .split('{{DATE}}').join(values.date)
    .split('{{HARNESS_CLI}}').join(values.cli);
}

// The bytes a project receives for a pack file: owned files get placeholders filled in.
export function renderForProject(entry, sourceBytes, values) {
  if (entry.policy !== 'owned') return sourceBytes;
  const text = sourceBytes.toString('utf8');
  if (!text.includes('{{')) return sourceBytes;
  return Buffer.from(substitutePlaceholders(text, values), 'utf8');
}

function failedPack(message) {
  return { ok: false, version: null, files: [], errors: [message] };
}
