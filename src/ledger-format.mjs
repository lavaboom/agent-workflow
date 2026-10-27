// Text form of the ledger summary, line for line as in the CLI spec.
import { FAILURE_LAYERS } from './ledger-stats.mjs';
import { formatTokens } from './usage.mjs';

const LABEL_WIDTH = 22;

// usage is null (not requested), { missing: file }, or the summarizeUsage result.
export function formatLedgerSummary(summary, usage) {
  const lines = [
    `Ledger ${summary.from} → ${summary.to} (${summary.rowCount} rows, ${summary.taskCount} tasks)`,
    labelled('Builds by model:', buildsText(summary.builds)),
    labelled('First-pass approval:', withCodex(summary.firstPass, firstPassItem)),
    labelled('Fix rounds per task:', `${withCodex(summary.fixRounds, fixRoundsItem)}     by tier: ${tierText(summary.fixRoundsByTier)}`),
    labelled('Escalations:', escalationsText(summary.escalations)),
    labelled('Failure layers (fix):', FAILURE_LAYERS.map((layer) => `${layer} ${summary.failureLayers[layer]}`).join('  ')),
    labelled('Overkill candidates:', overkillText(summary.overkill)),
    labelled('Named in fix notes:', mentionsText(summary.noteMentions)),
  ];
  if (usage !== null) lines.push(labelled('Usage (this machine):', usageText(usage)));
  return lines;
}

function labelled(label, text) {
  return `${label.padEnd(LABEL_WIDTH)}${text}`;
}

function buildsText(builds) {
  const claude = builds.claude.map((item) => `${item.model} ${item.count} (${item.percent} %)`).join('  ');
  const codex = builds.codex.map((item) => `${item.model} ${item.count}`).join(', ');
  return `${claude}  — codex ${codex}`;
}

// Claude models first; Codex models after a dash, only when Codex built something in the window.
function withCodex(perTool, formatItem) {
  const claude = perTool.claude.length > 0 ? perTool.claude.map(formatItem).join('  ') : 'none';
  if (perTool.codex.length === 0) return claude;
  return `${claude}  — codex ${perTool.codex.map(formatItem).join(', ')}`;
}

function firstPassItem(item) {
  const percent = item.percent === null ? 'n/a' : `${item.percent} %`;
  return `${item.model} ${item.approved}/${item.reviewed} (${percent})`;
}

function fixRoundsItem(item) {
  return `${item.model} ${item.mean.toFixed(2)}`;
}

function tierText(byTier) {
  return byTier.map((item) => `${item.tier} ${item.mean.toFixed(1)}`).join(' ');
}

function escalationsText(escalations) {
  return escalations.count === 0 ? '0' : `${escalations.count} (${escalations.tasks.join(', ')})`;
}

function overkillText(overkill) {
  const label = overkill.models.some((model) => /\bsol\b/i.test(model)) ? 'opus/sol' : 'opus';
  const head = `${overkill.count} ${label} builds approved first pass on docs/static/unit`;
  return overkill.count === 0 ? head : `${head}: ${overkill.tasks.join(', ')}`;
}

function mentionsText(mentions) {
  return mentions.length === 0 ? 'none' : mentions.map((item) => `${item.name} ${item.count}`).join('  ');
}

function usageText(usage) {
  if (usage.missing) return `no usage log at ${usage.missing}`;
  const models = usage.models.map((item) => `${item.model} ${formatTokens(item.totalIn)} in / ${formatTokens(item.output)} out`);
  return `${models.length > 0 ? models.join(' · ') : 'none'}  (${usage.sessions} sessions)`;
}
