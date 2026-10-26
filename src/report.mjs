// Turns a command result into output: text lines for people, or one JSON object with --json.

const ACTION_WIDTH = 12;

// Returns { stdout: string[], stderr: string[] }.
export function renderResult(result, { json }) {
  if (json) return { stdout: [JSON.stringify(publicResult(result), null, 2)], stderr: [] };
  return { stdout: textLines(result), stderr: result.errors.map((message) => `error: ${message}`) };
}

function textLines(result) {
  if (result.command === 'init') return initLines(result);
  if (result.command === 'adopt') return adoptLines(result);
  if (result.command === 'sync') return syncLines(result);
  if (result.command === 'check') return checkLines(result);
  if (result.command === 'ledger') return result.lines;
  if (result.command === 'vendor') return vendorLines(result);
  return [];
}

function adoptLines(result) {
  const lines = [...dryRunLine(result), ...result.items.map(itemLine)];
  if (!result.ok) return lines;
  lines.push(itemLine({ action: 'write', path: result.manifest, note: `template ${result.version}` }));
  lines.push('');
  lines.push(result.nextSteps === null ? '(the template has no NEXT-STEPS.txt)' : result.nextSteps);
  return lines;
}

// init: the adopt or sync lines, then (adopt) the next steps, then the git command when there is one.
function initLines(result) {
  if (result.mode === 'sync') return [...syncLines(result), ...gitCommandLines(result)];
  const lines = [...dryRunLine(result), ...result.items.flatMap(itemLines)];
  if (!result.ok) return lines;
  lines.push(itemLine({ action: 'write', path: result.manifest, note: `template ${result.version}` }));
  lines.push('');
  lines.push(result.nextSteps === null ? '(the template has no NEXT-STEPS.txt)' : result.nextSteps);
  return [...lines, ...gitCommandLines(result)];
}

function gitCommandLines(result) {
  if (result.gitCommand === null) return [];
  return ['', `Then stage and commit (init never commits)${result.dryRun ? ', after a run without --dry-run' : ''}:`, `  ${result.gitCommand}`];
}

function syncLines(result) {
  const lines = [...dryRunLine(result)];
  if (result.version !== null) lines.push(`template ${result.fromVersion ?? '?'} → ${result.version}`);
  lines.push(...result.items.flatMap(itemLines));
  if (result.manifestPlanned) lines.push(itemLine({ action: 'write', path: result.manifest, note: null }));
  return lines;
}

function vendorLines(result) {
  const lines = [...dryRunLine(result), ...result.items.map(itemLine)];
  if (result.ok) lines.push(itemLine({ action: 'write', path: result.manifest, note: `vendored from ${result.from} at ${result.version}` }));
  return lines;
}

function checkLines(result) {
  const lines = result.results.map((item) => `${item.level.padEnd(5)} ${item.check}: ${item.message}`);
  lines.push(`${result.mode} checks: ${result.counts.ok} ok, ${result.counts.warn} warn, ${result.counts.fail} fail`);
  return lines;
}

function dryRunLine(result) {
  return result.dryRun ? ['dry run: nothing written'] : [];
}

// An item's line, then its details (filled settings, added lines) indented under it.
function itemLines(item) {
  const details = Array.isArray(item.details) ? item.details.map((detail) => `${' '.repeat(ACTION_WIDTH + 2)}${detail}`) : [];
  return [itemLine(item), ...details];
}

function itemLine(item) {
  const note = item.note ? `  (${item.note})` : '';
  return `${item.action.padEnd(ACTION_WIDTH)}${item.path}${note}`;
}

// The JSON form drops file bytes and the pre-rendered text lines.
export function publicResult(result) {
  const copy = { ...result };
  if (Array.isArray(copy.items)) copy.items = copy.items.map(({ bytes, ...rest }) => rest);
  if (copy.command === 'ledger') delete copy.lines;
  return copy;
}
