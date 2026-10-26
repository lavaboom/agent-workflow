// Template checks for `check --template-only`: template.json and the files on disk agree, managed files
// hold no placeholders, `from` links resolve, the entry file is lean, rules and topic docs carry metadata.
import path from 'node:path';
import { listFilesRecursive, readTextIfExists } from './files.mjs';
import { NEXT_STEPS, PACK_METADATA, loadPack, packSourcePath, readPackBytes } from './pack.mjs';
import { entrySizeFindings, finding, isMetadataDoc, metadataFindings, orOk, reviewByFindings } from './doc-checks.mjs';

// options: { templateDir, today }
export async function runTemplateChecks({ templateDir, today }) {
  const pack = await loadPack(templateDir);
  if (!pack.ok) return pack.errors.map((message) => finding('pack-manifest', 'fail', message));
  const onDisk = (await listFilesRecursive(templateDir)).filter((p) => !PACK_METADATA.includes(p));
  const docs = await readDocs(templateDir, pack.files.filter((entry) => isMetadataDoc(entry.path)));
  const entry = pack.files.find((file) => file.path === 'AGENTS.md');
  const entryText = entry ? (await readPackBytes(templateDir, entry))?.toString('utf8') ?? null : null;
  return [
    finding('pack-manifest', 'ok', `template.json version ${pack.version}, ${pack.files.length} files`),
    ...packListingFindings(pack.files, onDisk),
    ...fromTargetFindings(pack.files, onDisk),
    ...await placeholderFindings(templateDir, pack.files),
    ...entrySizeFindings('AGENTS.md', entryText, { warnAbove: null, failAbove: 100 }),
    ...metadataFindings(docs.filter((doc) => doc.text !== null), 'fail'),
    ...reviewByFindings(docs.filter((doc) => doc.text !== null), today),
    ...await nextStepsFindings(templateDir),
  ];
}

// Every file on disk is listed, and every listed file without `from` is on disk.
export function packListingFindings(files, onDisk) {
  const listed = new Set(files.map((entry) => entry.path));
  const present = new Set(onDisk);
  const findings = [];
  for (const filePath of onDisk) {
    if (!listed.has(filePath)) findings.push(finding('pack-listing', 'fail', `${filePath} is in template/ but not in template.json`));
  }
  for (const entry of files) {
    if (entry.from === null && !present.has(entry.path)) {
      findings.push(finding('pack-listing', 'fail', `${entry.path} is listed in template.json but absent`));
    }
    if (entry.from !== null && present.has(entry.path)) {
      findings.push(finding('pack-listing', 'warn', `${entry.path} has "from" but a copy also exists at its path; keep one source`));
    }
  }
  return orOk('pack-listing', findings, `template.json and template/ list the same ${onDisk.length} file(s)`);
}

// An entry with `from` has no file of its own: its target must be a listed file that exists on disk.
export function fromTargetFindings(files, onDisk) {
  const byPath = new Map(files.map((entry) => [entry.path, entry]));
  const present = new Set(onDisk);
  const findings = [];
  for (const entry of files.filter((file) => file.from !== null)) {
    const problem = fromTargetProblem(byPath.get(entry.from), present.has(entry.from));
    if (problem) findings.push(finding('from-targets', 'fail', `${entry.path} has from "${entry.from}", ${problem}`));
  }
  return orOk('from-targets', findings, 'every "from" points at a listed file that exists');
}

function fromTargetProblem(target, targetOnDisk) {
  if (!target) return 'which is not listed';
  if (target.from !== null) return 'which itself has "from"';
  if (!targetOnDisk) return 'which is absent from template/';
  return null;
}

async function placeholderFindings(templateDir, files) {
  const findings = [];
  const seen = new Set();
  for (const entry of files.filter((file) => file.policy === 'managed')) {
    const source = packSourcePath(entry);
    if (seen.has(source)) continue;
    seen.add(source);
    const bytes = await readPackBytes(templateDir, entry);
    if (bytes !== null && bytes.includes('{{')) findings.push(finding('no-placeholders', 'fail', `${source} is managed and contains "{{"`));
  }
  return orOk('no-placeholders', findings, 'no managed file contains "{{"');
}

async function readDocs(templateDir, entries) {
  const docs = [];
  for (const entry of entries) {
    const bytes = await readPackBytes(templateDir, entry);
    docs.push({ path: entry.path, text: bytes === null ? null : bytes.toString('utf8') });
  }
  return docs;
}

async function nextStepsFindings(templateDir) {
  const text = await readTextIfExists(path.join(templateDir, NEXT_STEPS));
  if (text === null) return [finding('next-steps', 'warn', `${NEXT_STEPS} missing; adopt prints no readiness checklist`)];
  return [finding('next-steps', 'ok', `${NEXT_STEPS} present`)];
}
