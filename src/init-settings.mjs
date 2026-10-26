// `init`: read the v1 Workflow settings table and carry its values into the v2 AGENTS.md.
import { buildRow, findTableUnderHeading, findTables, nameAndValue, splitRow } from './markdown-table.mjs';
import { joinLines, lineEnding, splitLines } from './text.mjs';

const SETTINGS_HEADING = /workflow settings/i;
const DATED = /\d{4}-\d{2}-\d{2}/;
// v1 settings with no v2 row: Builder checks becomes a comment under the tier table; the others are
// dropped (Local services is a fixed path in v2; Project is the title).
export const BUILDER_CHECKS = 'Builder checks';
const DROPPED = ['Local services', 'Project'];
// Filled by adopt from the CLI's own path, never from the old table.
const HARNESS_CLI = 'Harness CLI';

// "Hard areas (`opus-xhigh`)" → name "Hard areas"; "Who pushes (owner, 2026-10-22)" → name "Who pushes" and
// the dated parenthetical (an owner decision) kept for the value: "(owner, 2026-10-22) ".
export function normaliseSettingName(rawName) {
  const kept = [];
  const name = rawName.replace(/\([^()]*\)/g, (group) => {
    if (DATED.test(group)) kept.push(group);
    return ' ';
  }).replace(/`/g, '').replace(/\s+/g, ' ').trim();
  return { name, prefix: kept.length > 0 ? `${kept.join(' ')} ` : '' };
}

export function settingKey(name) {
  return name.toLowerCase();
}

// A value that is only a template placeholder ("<the command …>") was never filled in.
export function isPlaceholderValue(value) {
  return value.trim() === '' || /^<[^<>]*>$/.test(value.trim());
}

// Returns { found, settings: [{ name, rawName, value }] }. Only the first table under the first heading
// containing "Workflow settings" counts; tables elsewhere in the file are ignored.
export function parseWorkflowSettings(text) {
  const lines = splitLines(text);
  const table = findTableUnderHeading(lines, SETTINGS_HEADING);
  if (table === null) return { found: false, settings: [] };
  const settings = [];
  const seen = new Set();
  for (let i = table.firstRow; i < table.end; i += 1) {
    const { name: rawName, value } = nameAndValue(splitRow(lines[i]), table.header.length);
    const { name, prefix } = normaliseSettingName(rawName);
    if (name === '' || seen.has(settingKey(name))) continue;
    seen.add(settingKey(name));
    settings.push({ name, rawName, value: isPlaceholderValue(value) ? value : `${prefix}${value}` });
  }
  return { found: true, settings };
}

// The v1 Project setting, when it holds a real name.
export function projectSetting(settings) {
  const row = settings.find((setting) => settingKey(setting.name) === settingKey('Project'));
  if (!row || isPlaceholderValue(row.value)) return null;
  const name = row.value.replace(/`/g, '').trim();
  return name === '' ? null : name;
}

// Fills the v2 AGENTS.md text. Returns { text, filled: [{ name, value }], builderChecks, unmatched: [names] }.
export function fillEntryFile(text, settings, projectName) {
  const eol = lineEnding(text);
  const lines = splitLines(text);
  if (lines.length > 0) lines[0] = `# ${projectName}`;
  const byKey = new Map(settings.map((setting) => [settingKey(setting.name), setting]));
  const used = new Set();
  const filled = [];
  const table = findTableUnderHeading(lines, SETTINGS_HEADING);
  if (table !== null) {
    for (let i = table.firstRow; i < table.end; i += 1) {
      const cells = splitRow(lines[i]);
      const { name } = normaliseSettingName(cells[0] ?? '');
      const setting = byKey.get(settingKey(name));
      if (!setting || settingKey(name) === settingKey(HARNESS_CLI)) continue;
      used.add(settingKey(name));
      if (isPlaceholderValue(setting.value)) continue;
      lines[i] = buildRow([cells[0], setting.value]);
      filled.push({ name, value: setting.value });
    }
  }
  const builderChecks = byKey.get(settingKey(BUILDER_CHECKS));
  const usableChecks = builderChecks && !isPlaceholderValue(builderChecks.value) ? builderChecks.value : null;
  if (usableChecks !== null) insertBuilderChecksComment(lines, usableChecks, table);
  const ignored = new Set([BUILDER_CHECKS, ...DROPPED, HARNESS_CLI].map(settingKey));
  const unmatched = settings.filter((s) => !used.has(settingKey(s.name)) && !ignored.has(settingKey(s.name))).map((s) => s.name);
  return { text: joinLines(lines, eol), filled, builderChecks: usableChecks, unmatched };
}

// Directly under the verification tier table (the table whose first header cell is "Tier"); under the
// settings table when the file has no tier table.
function insertBuilderChecksComment(lines, value, settingsTable) {
  const tierTable = findTables(lines).find((table) => table.header[0]?.replace(/`/g, '').trim().toLowerCase() === 'tier');
  const anchor = tierTable ?? settingsTable;
  const comment = `<!-- v1 Builder checks: ${value.replace(/-->/g, '-- >')} ; split these into the tier rows above -->`;
  if (anchor) lines.splice(anchor.end, 0, comment);
  else lines.push('', comment);
}
