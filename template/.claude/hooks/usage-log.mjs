#!/usr/bin/env node
// Stop hook: sums token usage per model from the session transcript and its subagents' transcripts and
// appends one JSON line to <claude dir>/metrics/usage.jsonl (<claude dir> is $CLAUDE_CONFIG_DIR, else ~/.claude).
// It never writes to stdout, swallows every error and always exits 0: a hook must not block Claude.
// Rows are cumulative per session; `agent-workflow ledger --usage` keeps the last row per session_id.
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const GUARD_MS = 4000;

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseObject(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function count(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function usageCounts(usage) {
  return {
    input: count(usage.input_tokens),
    output: count(usage.output_tokens),
    cache_read: count(usage.cache_read_input_tokens),
    cache_write: count(usage.cache_creation_input_tokens),
  };
}

async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

// A session id used as a folder name: one plain segment, so it cannot lead outside the transcript folder.
function isPlainSegment(value) {
  return /^[A-Za-z0-9._-]+$/.test(value) && value !== '.' && value !== '..';
}

// Subagent transcripts live beside the main one: <dirname(transcript)>/<session_id>/subagents/*.jsonl.
async function subagentTranscripts(transcriptPath, sessionId) {
  if (!isPlainSegment(sessionId)) return [];
  const dir = path.join(path.dirname(transcriptPath), sessionId, 'subagents');
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  return names.filter((name) => name.endsWith('.jsonl')).sort().map((name) => path.join(dir, name));
}

// Claude Code writes one transcript entry per content block, each repeating the message's usage;
// keeping the last entry per message id counts every API response once, across all the files read.
async function collectUsage(file, collector) {
  const stream = createReadStream(file, { encoding: 'utf8' });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (!line.includes('"assistant"')) continue;
      const entry = parseObject(line);
      const message = entry && entry.type === 'assistant' ? entry.message : null;
      if (!message || typeof message.model !== 'string' || !message.usage || message.model === '<synthetic>') continue;
      collector.anonymous += 1;
      const key = typeof message.id === 'string' ? message.id : `#${collector.anonymous}`;
      collector.byMessage.set(key, { model: message.model, counts: usageCounts(message.usage) });
    }
  } finally {
    stream.destroy();
  }
}

// Sums the main transcript and its subagents' transcripts per model; null when the main one is missing.
// A subagent file that cannot be read is skipped; the rest still count.
async function sumSession(transcriptPath, sessionId) {
  if (!(await isFile(transcriptPath))) return null;
  const collector = { byMessage: new Map(), anonymous: 0 };
  await collectUsage(transcriptPath, collector);
  for (const file of await subagentTranscripts(transcriptPath, sessionId)) {
    try {
      await collectUsage(file, collector);
    } catch {
      // an unreadable subagent transcript
    }
  }
  return totalsByModel(collector.byMessage);
}

function totalsByModel(byMessage) {
  const models = {};
  for (const { model, counts } of byMessage.values()) {
    const total = models[model] ?? { input: 0, output: 0, cache_read: 0, cache_write: 0 };
    for (const key of Object.keys(total)) total[key] += counts[key];
    models[model] = total;
  }
  return models;
}

// The git root of dir (a linked worktree resolves to its main checkout), else null.
async function findGitRoot(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    let info = null;
    try {
      info = await stat(path.join(dir, '.git'));
    } catch {
      info = null;
    }
    if (info) return info.isFile() ? mainCheckoutOf(dir) : dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

async function mainCheckoutOf(dir) {
  let text;
  try {
    text = await readFile(path.join(dir, '.git'), 'utf8');
  } catch {
    return dir;
  }
  const match = /^gitdir:\s*(.+?)\s*$/m.exec(text);
  if (!match) return dir;
  const worktrees = path.dirname(path.resolve(dir, match[1]));
  const dotGitDir = path.dirname(worktrees);
  if (path.basename(worktrees) === 'worktrees' && path.basename(dotGitDir) === '.git') return path.dirname(dotGitDir);
  return dir;
}

function claudeDir() {
  const configured = process.env.CLAUDE_CONFIG_DIR;
  return configured ? path.resolve(configured) : path.join(os.homedir(), '.claude');
}

function sessionIdOf(input) {
  if (typeof input.session_id === 'string' && input.session_id !== '') return input.session_id;
  return path.basename(input.transcript_path, '.jsonl');
}

async function main() {
  const input = parseObject(await readStdin());
  if (!input || typeof input.transcript_path !== 'string' || input.transcript_path === '') return;
  const sessionId = sessionIdOf(input);
  const models = await sumSession(input.transcript_path, sessionId);
  if (models === null) return;
  const cwd = typeof input.cwd === 'string' && input.cwd !== '' ? input.cwd : process.cwd();
  const root = await findGitRoot(cwd);
  const row = {
    ts: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    project: path.basename(root ?? path.resolve(cwd)),
    session_id: sessionId,
    models,
  };
  const metricsDir = path.join(claudeDir(), 'metrics');
  await mkdir(metricsDir, { recursive: true });
  await appendFile(path.join(metricsDir, 'usage.jsonl'), `${JSON.stringify(row)}\n`, 'utf8');
}

process.on('uncaughtException', () => process.exit(0));
process.on('unhandledRejection', () => process.exit(0));
setTimeout(() => process.exit(0), GUARD_MS).unref();
main().catch(() => {}).finally(() => {
  process.exitCode = 0;
});
