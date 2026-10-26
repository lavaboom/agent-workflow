// Checks shared by the project and template modes: which files are rules and topic docs, and the
// findings for their metadata headers and review-by dates. Findings are { check, level, message }.
import { missingMetadataKeys, readHeader, reviewByDate } from './headers.mjs';
import { countLines } from './text.mjs';

export const RULES_DIR = '.claude/rules';
export const TOPIC_DIR = 'docs/harness';
const NOT_TOPIC_DOCS = new Set(['ledger.md', 'lessons.md', 'review-log.md', 'README.md']);

export function isRulePath(posixPath) {
  return posixPath.startsWith(`${RULES_DIR}/`) && posixPath.endsWith('.md');
}

export function isTopicDocPath(posixPath) {
  if (!posixPath.startsWith(`${TOPIC_DIR}/`) || !posixPath.endsWith('.md')) return false;
  const name = posixPath.slice(TOPIC_DIR.length + 1);
  return !name.includes('/') && !NOT_TOPIC_DOCS.has(name);
}

export function isMetadataDoc(posixPath) {
  return isRulePath(posixPath) || isTopicDocPath(posixPath);
}

export function finding(check, level, message) {
  return { check, level, message };
}

// Returns findings, or a single ok finding when there are none.
export function orOk(check, findings, okMessage) {
  return findings.length > 0 ? findings : [finding(check, 'ok', okMessage)];
}

// docs: [{ path, text }]. level is 'warn' for projects and 'fail' for the template.
export function metadataFindings(docs, level) {
  const findings = [];
  for (const doc of docs) {
    const missing = missingMetadataKeys(readHeader(doc.text));
    if (missing.length > 0) findings.push(finding('rule-metadata', level, `${doc.path} header lacks ${missing.join(' ')}`));
  }
  return orOk('rule-metadata', findings, `${docs.length} rule and topic doc(s) carry source:, applies:, review-by:`);
}

export function reviewByFindings(docs, today) {
  const findings = [];
  for (const doc of docs) {
    const date = reviewByDate(readHeader(doc.text));
    if (date !== null && date < today) findings.push(finding('review-by', 'warn', `${doc.path} review-by ${date} is past`));
  }
  return orOk('review-by', findings, 'no review-by date is past');
}

// limits: { warnAbove, failAbove } (either may be null).
export function entrySizeFindings(entryPath, text, limits) {
  if (text === null) return [finding('entry-size', 'fail', `${entryPath} missing`)];
  const lines = countLines(text);
  if (limits.failAbove !== null && lines > limits.failAbove) {
    return [finding('entry-size', 'fail', `${entryPath} has ${lines} lines (over ${limits.failAbove})`)];
  }
  if (limits.warnAbove !== null && lines > limits.warnAbove) {
    return [finding('entry-size', 'warn', `${entryPath} has ${lines} lines (over ${limits.warnAbove})`)];
  }
  return [finding('entry-size', 'ok', `${entryPath} has ${lines} lines`)];
}
