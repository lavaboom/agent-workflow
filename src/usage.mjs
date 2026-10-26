// Reads the per-machine usage log written by the usage-log Stop hook and summarises it for one project.
import path from 'node:path';
import { readTextIfExists } from './files.mjs';
import { splitLines } from './text.mjs';

const FAMILY_ORDER = ['opus', 'sonnet', 'haiku'];

export function claudeDir(env, homeDir) {
  return env.CLAUDE_CONFIG_DIR ? path.resolve(env.CLAUDE_CONFIG_DIR) : path.join(homeDir, '.claude');
}

export function usageFile(claudeDirPath) {
  return path.join(claudeDirPath, 'metrics', 'usage.jsonl');
}

// Returns { exists, rows, badLines }. Lines that are not JSON objects with a session_id are skipped.
export async function readUsageRows(file) {
  const text = await readTextIfExists(file);
  if (text === null) return { exists: false, rows: [], badLines: 0 };
  const rows = [];
  let badLines = 0;
  for (const line of splitLines(text)) {
    if (line.trim() === '') continue;
    const row = parseUsageLine(line);
    if (row) rows.push(row);
    else badLines += 1;
  }
  return { exists: true, rows, badLines };
}

function parseUsageLine(line) {
  try {
    const row = JSON.parse(line);
    if (row && typeof row === 'object' && typeof row.session_id === 'string' && row.models && typeof row.models === 'object') return row;
  } catch {
    // a truncated or foreign line
  }
  return null;
}

// Rows are cumulative per session: keep the last row per session_id, then apply the project and window.
// sinceIso is an ISO date or null for all time. Input counts every input-side token (input + cache).
export function summarizeUsage(rows, { project, sinceIso }) {
  const lastBySession = new Map();
  for (const row of rows) {
    if (row.project === project) lastBySession.set(row.session_id, row);
  }
  const sinceMs = sinceIso === null ? null : Date.parse(`${sinceIso}T00:00:00Z`);
  const sessions = [...lastBySession.values()].filter((row) => sinceMs === null || Date.parse(row.ts) >= sinceMs);
  const families = new Map();
  for (const session of sessions) {
    for (const [model, counts] of Object.entries(session.models)) addCounts(families, modelFamily(model), counts);
  }
  return { sessions: sessions.length, models: orderFamilies(families) };
}

function addCounts(families, family, counts) {
  const total = families.get(family) ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  total.input += toCount(counts.input);
  total.output += toCount(counts.output);
  total.cacheRead += toCount(counts.cache_read);
  total.cacheWrite += toCount(counts.cache_write);
  families.set(family, total);
}

function orderFamilies(families) {
  const names = [...families.keys()].sort((a, b) => familyRank(a) - familyRank(b) || (a < b ? -1 : 1));
  return names.map((model) => {
    const counts = families.get(model);
    return { model, ...counts, totalIn: counts.input + counts.cacheRead + counts.cacheWrite };
  });
}

function familyRank(name) {
  const rank = FAMILY_ORDER.indexOf(name);
  return rank < 0 ? FAMILY_ORDER.length : rank;
}

export function modelFamily(modelId) {
  const lower = String(modelId).toLowerCase();
  return FAMILY_ORDER.find((family) => lower.includes(family)) ?? String(modelId);
}

// 950 -> 950, 2300 -> 2.3k, 85000 -> 85k, 1200000 -> 1.2M.
export function formatTokens(count) {
  if (count < 1000) return String(count);
  if (count < 10000) return `${trimZero((count / 1000).toFixed(1))}k`;
  if (count < 999500) return `${Math.round(count / 1000)}k`;
  return `${trimZero((count / 1000000).toFixed(1))}M`;
}

function trimZero(text) {
  return text.endsWith('.0') ? text.slice(0, -2) : text;
}

function toCount(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
