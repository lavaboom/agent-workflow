// `ledger`: reads docs/harness/ledger.md (and, with --usage, the machine's usage log) and summarises it.
import { nativePath, readTextIfExists } from './files.mjs';
import { addDays, utcDateString } from './dates.mjs';
import { projectNameFor } from './gitroot.mjs';
import { formatLedgerSummary } from './ledger-format.mjs';
import { summarizeLedger } from './ledger-stats.mjs';
import { LEDGER_PATH, parseLedger } from './table.mjs';
import { readUsageRows, summarizeUsage, usageFile } from './usage.mjs';

export const DEFAULT_WINDOW_DAYS = 7;

// options: { projectDir, now, since, all, usage, claudeDir }
export async function runLedger(options) {
  const result = { command: 'ledger', ok: false, exitCode: 1, summary: null, usage: null, lines: [], errors: [] };
  const text = await readTextIfExists(nativePath(options.projectDir, LEDGER_PATH));
  if (text === null) {
    result.errors.push(`${LEDGER_PATH} missing`);
    return result;
  }
  const parsed = parseLedger(text);
  const today = utcDateString(options.now);
  const window = {
    since: options.since ?? addDays(today, -DEFAULT_WINDOW_DAYS),
    until: today,
    all: Boolean(options.all),
  };
  result.summary = summarizeLedger(parsed.rows, window);
  if (options.usage) result.usage = await loadUsage(options, window);
  result.lines = formatLedgerSummary(result.summary, result.usage);
  result.errors.push(...parsed.errors.map((error) => `${LEDGER_PATH} line ${error.line}: ${error.message} (row ignored)`));
  result.ok = parsed.errors.length === 0;
  result.exitCode = result.ok ? 0 : 1;
  return result;
}

async function loadUsage(options, window) {
  const file = usageFile(options.claudeDir);
  const read = await readUsageRows(file);
  if (!read.exists) return { missing: file, file, sessions: 0, models: [] };
  const project = await projectNameFor(options.projectDir);
  const summary = summarizeUsage(read.rows, { project, sinceIso: window.all ? null : window.since });
  return { ...summary, file, project, badLines: read.badLines };
}
