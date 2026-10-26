// Project checks for `check`: lean entry file and rules, metadata freshness, manifest drift, board and ledger.
import path from 'node:path';
import { contentHash } from './hash.mjs';
import { listFilesRecursive, nativePath, readBytesIfExists, readTextIfExists } from './files.mjs';
import { readHeader } from './headers.mjs';
import { readManifest, MANIFEST_PATH } from './manifest.mjs';
import { loadPack } from './pack.mjs';
import { LEDGER_PATH, parseLedger } from './table.mjs';
import { countLines } from './text.mjs';
import { compareVersions } from './versions.mjs';
import { vendoredFiles } from './vendor.mjs';
import {
  RULES_DIR, TOPIC_DIR, entrySizeFindings, finding, isMetadataDoc, isRulePath, metadataFindings, orOk, reviewByFindings,
} from './doc-checks.mjs';

export const BOARD_PATH = 'docs/manager/board.md';
const MAX_ALWAYS_ON_RULES = 4;
const MAX_ALWAYS_ON_LINES = 60;

// options: { projectDir, templateDir, today }
export async function runProjectChecks({ projectDir, templateDir, today }) {
  const docs = await readMetadataDocs(projectDir);
  const manifest = await readManifest(projectDir);
  return [
    ...entrySizeFindings('AGENTS.md', await readTextIfExists(path.join(projectDir, 'AGENTS.md')), { warnAbove: 100, failAbove: 150 }),
    ...alwaysOnRuleFindings(docs.filter((doc) => isRulePath(doc.path))),
    ...metadataFindings(docs, 'warn'),
    ...reviewByFindings(docs, today),
    ...await manifestDriftFindings(projectDir, templateDir, manifest),
    ...await vendoredDriftFindings(projectDir, manifest),
    ...boardLineFindings(await readTextIfExists(nativePath(projectDir, BOARD_PATH))),
    ...ledgerShapeFindings(await readTextIfExists(nativePath(projectDir, LEDGER_PATH))),
    ...claudeMdFindings(await readTextIfExists(path.join(projectDir, 'CLAUDE.md'))),
  ];
}

async function readMetadataDocs(projectDir) {
  const rulePaths = (await listFilesRecursive(nativePath(projectDir, RULES_DIR))).map((p) => `${RULES_DIR}/${p}`);
  const topicPaths = (await listFilesRecursive(nativePath(projectDir, TOPIC_DIR))).map((p) => `${TOPIC_DIR}/${p}`);
  const docs = [];
  for (const docPath of [...rulePaths, ...topicPaths].filter(isMetadataDoc)) {
    docs.push({ path: docPath, text: await readTextIfExists(nativePath(projectDir, docPath)) });
  }
  return docs;
}

export function alwaysOnRuleFindings(ruleDocs) {
  const alwaysOn = ruleDocs.filter((doc) => !readHeader(doc.text).hasPaths);
  const findings = [];
  if (alwaysOn.length > MAX_ALWAYS_ON_RULES) {
    findings.push(finding('always-on-rules', 'warn', `${alwaysOn.length} always-on rules (more than ${MAX_ALWAYS_ON_RULES}); give some a paths: frontmatter`));
  }
  for (const doc of alwaysOn) {
    const lines = countLines(doc.text);
    if (lines > MAX_ALWAYS_ON_LINES) {
      findings.push(finding('always-on-rules', 'warn', `${doc.path} is always-on and has ${lines} lines (over ${MAX_ALWAYS_ON_LINES})`));
    }
  }
  return orOk('always-on-rules', findings, `${alwaysOn.length} always-on rule(s), none over ${MAX_ALWAYS_ON_LINES} lines`);
}

// current is the readManifest result. An invalid manifest fails: sync and vendor refuse to run on it.
async function manifestDriftFindings(projectDir, templateDir, current) {
  if (!current.exists) return [finding('manifest-drift', 'warn', `${MANIFEST_PATH} missing; project not adopted`)];
  if (!current.ok) return current.errors.map((message) => finding('manifest-drift', 'fail', message));
  const findings = [];
  for (const [filePath, recorded] of Object.entries(current.manifest.files)) {
    if (recorded.policy !== 'managed') continue;
    const bytes = await readBytesIfExists(nativePath(projectDir, filePath));
    if (bytes === null) findings.push(finding('manifest-drift', 'warn', `${filePath} missing (managed)`));
    else if (contentHash(bytes) !== recorded.sha256) findings.push(finding('manifest-drift', 'warn', `${filePath} edited locally (hash differs from the manifest)`));
  }
  findings.push(...await versionFindings(current.manifest.templateVersion, templateDir));
  return orOk('manifest-drift', findings, `managed files match the manifest; template ${current.manifest.templateVersion}`);
}

async function vendoredDriftFindings(projectDir, current) {
  if (current.exists && !current.ok) return [finding('vendored-drift', 'warn', 'not checked: the manifest is invalid (see manifest-drift)')];
  const vendored = current.ok && current.manifest.vendored ? current.manifest.vendored : {};
  const findings = [];
  let fileCount = 0;
  for (const [destination, record] of Object.entries(vendored)) {
    for (const file of vendoredFiles(destination, record)) {
      fileCount += 1;
      const bytes = await readBytesIfExists(nativePath(projectDir, file.path));
      const origin = `${record.source} ${record.version}`;
      if (bytes === null) findings.push(finding('vendored-drift', 'warn', `${file.path} (vendored from ${origin}) is missing`));
      else if (contentHash(bytes) !== file.sha256) {
        findings.push(finding('vendored-drift', 'warn', `${file.path} differs from the vendored copy of ${origin}: a local edit (expected after trimming an ECC agent)`));
      }
    }
  }
  return orOk('vendored-drift', findings, fileCount === 0 ? 'no vendored files' : `${fileCount} vendored file(s) match the manifest`);
}

async function versionFindings(projectVersion, templateDir) {
  const pack = await loadPack(templateDir);
  if (!pack.ok) return [finding('manifest-drift', 'warn', `cannot read the template to compare versions: ${pack.errors[0]}`)];
  if (compareVersions(projectVersion ?? '0', pack.version) < 0) {
    return [finding('manifest-drift', 'warn', `update available: ${projectVersion} → ${pack.version}`)];
  }
  return [];
}

export function boardLineFindings(text) {
  if (text === null) return [finding('board-lines', 'fail', `${BOARD_PATH} missing`)];
  const findings = [];
  for (const label of ['Next step:', 'Current issues:']) {
    if (!text.includes(label)) findings.push(finding('board-lines', 'fail', `${BOARD_PATH} has no "${label}" line`));
  }
  return orOk('board-lines', findings, `${BOARD_PATH} has "Next step:" and "Current issues:"`);
}

export function ledgerShapeFindings(text) {
  if (text === null) return [finding('ledger-shape', 'fail', `${LEDGER_PATH} missing`)];
  const parsed = parseLedger(text);
  const findings = parsed.errors.map((error) => finding('ledger-shape', 'fail', `${LEDGER_PATH} line ${error.line}: ${error.message}`));
  return orOk('ledger-shape', findings, `${LEDGER_PATH} parses (${parsed.rows.length} rows)`);
}

// A CLAUDE.md that only imports AGENTS.md is the supported shim for older Claude Code.
export function claudeMdFindings(text) {
  if (text === null) return [finding('no-claude-md', 'ok', 'no CLAUDE.md')];
  if (text.trim() === '@AGENTS.md') return [finding('no-claude-md', 'ok', 'CLAUDE.md only imports @AGENTS.md')];
  return [finding('no-claude-md', 'warn', 'AGENTS.md is the entry file; keep CLAUDE.md only as `@AGENTS.md` for older Claude Code')];
}
