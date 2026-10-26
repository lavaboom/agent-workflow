// Turns a command result into output: text lines for people, or one JSON object with --json.

const ACTION_WIDTH = 12;

// Returns { stdout: string[], stderr: string[] }.
export function renderResult(result, { json }) {
  if (json) return { stdout: [JSON.stringify(publicResult(result), null, 2)], stderr: [] };
  return { stdout: textLines(result), stderr: result.errors.map((message) => `error: ${message}`) };
}

function textLines(result) {
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

function syncLines(result) {
  const lines = [...dryRunLine(result)];
  if (result.version !== null) lines.push(`template ${result.fromVersion ?? '?'} → ${result.version}`);
  lines.push(...result.items.map(itemLine));
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
