// Parser for the ledger table in docs/harness/ledger.md (one markdown table under "## Rows").
import { isIsoDate } from './dates.mjs';
import { splitLines } from './text.mjs';

export const LEDGER_PATH = 'docs/harness/ledger.md';
export const LEDGER_COLUMNS = ['date', 'task', 'step', 'role', 'tool', 'model', 'effort', 'tier', 'round', 'outcome', 'layer', 'note'];

export const LEDGER_ENUMS = {
  step: ['build', 'review', 'fix', 'close'],
  role: ['builder', 'reviewer', 'explorer', 'manager'],
  tool: ['claude', 'codex'],
  effort: ['low', 'medium', 'high', 'xhigh', 'max'],
  tier: ['docs', 'static', 'unit', 'integration', 'e2e'],
  outcome: ['built', 'blocked', 'abandoned', 'approve', 'fix', 'escalated', 'done'],
  layer: ['spec', 'context', 'environment', 'verification', 'state', 'capability', 'none'],
};

// The outcomes each step may record (cli-spec §4, revised).
export const OUTCOMES_BY_STEP = {
  build: ['built', 'blocked', 'abandoned'],
  fix: ['built', 'blocked', 'abandoned'],
  review: ['approve', 'fix', 'escalated'],
  close: ['done'],
};

const ROWS_HEADING = /^##\s+Rows\s*$/;
const ANY_HEADING = /^#{1,6}\s/;

// Returns { ok, rows, errors } where errors are { line, message } with 1-based line numbers.
// Blank lines, the alignment row, HTML comments and prose (a line not starting with |, such as a note a
// session left under the rows) are ignored; every line starting with | is a row.
export function parseLedger(text) {
  const lines = splitLines(text);
  const start = lines.findIndex((line) => ROWS_HEADING.test(line.trim()));
  if (start < 0) return { ok: false, rows: [], errors: [{ line: 0, message: 'no "## Rows" heading' }] };
  const rows = [];
  const errors = [];
  let headerSeen = false;
  let inComment = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    const lineNumber = i + 1;
    if (inComment) {
      inComment = !trimmed.includes('-->');
      continue;
    }
    if (ANY_HEADING.test(trimmed)) break;
    if (trimmed.startsWith('<!--')) {
      inComment = !trimmed.includes('-->');
      continue;
    }
    if (trimmed === '' || !trimmed.startsWith('|')) continue;
    const cells = splitRow(trimmed);
    if (!headerSeen) {
      headerSeen = true;
      const headerError = checkHeader(cells);
      if (headerError) errors.push({ line: lineNumber, message: headerError });
      continue;
    }
    if (isAlignmentRow(cells)) continue;
    const parsed = parseRow(cells, lineNumber);
    if (parsed.error) errors.push({ line: lineNumber, message: parsed.error });
    else rows.push(parsed.row);
  }
  if (!headerSeen) errors.push({ line: start + 1, message: 'no table header under "## Rows"' });
  return { ok: errors.length === 0, rows, errors };
}

export function splitRow(trimmedLine) {
  let inner = trimmedLine;
  if (inner.startsWith('|')) inner = inner.slice(1);
  if (inner.endsWith('|')) inner = inner.slice(0, -1);
  return inner.split('|').map((cell) => cell.trim());
}

function isAlignmentRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

function checkHeader(cells) {
  const names = cells.map((cell) => cell.toLowerCase());
  if (names.length === LEDGER_COLUMNS.length && names.every((name, i) => name === LEDGER_COLUMNS[i])) return null;
  return `table header must be | ${LEDGER_COLUMNS.join(' | ')} |`;
}

// Returns { row } or { error }.
export function parseRow(cells, lineNumber) {
  if (cells.length !== LEDGER_COLUMNS.length) {
    return { error: `expected ${LEDGER_COLUMNS.length} cells, found ${cells.length}` };
  }
  const raw = Object.fromEntries(LEDGER_COLUMNS.map((name, i) => [name, cells[i]]));
  const problems = [];
  if (!isIsoDate(raw.date)) problems.push(`date "${raw.date}" is not an ISO date`);
  // Any id the project uses: task-NNN, a group's lead task, or a roadmap item such as P2.1 (a Codex project).
  if (raw.task === '') problems.push('task is empty');
  if (raw.model === '') problems.push('model is empty');
  if (!/^\d+$/.test(raw.round) || Number(raw.round) < 1) problems.push(`round "${raw.round}" is not a positive integer`);
  const row = { line: lineNumber, ...raw, round: Number(raw.round) };
  for (const [column, allowed] of Object.entries(LEDGER_ENUMS)) {
    const value = raw[column].toLowerCase();
    if (!allowed.includes(value)) problems.push(`unknown ${column} "${raw[column]}"`);
    row[column] = value;
  }
  const pairing = outcomeProblem(row.step, row.outcome);
  if (pairing) problems.push(pairing);
  return problems.length > 0 ? { error: problems.join('; ') } : { row };
}

// A known outcome that the row's step does not allow; unknown values are reported by the enum check.
function outcomeProblem(step, outcome) {
  const allowed = OUTCOMES_BY_STEP[step];
  if (!allowed || !LEDGER_ENUMS.outcome.includes(outcome) || allowed.includes(outcome)) return null;
  return `outcome "${outcome}" is not valid on a ${step} row (${allowed.join(', ')})`;
}
