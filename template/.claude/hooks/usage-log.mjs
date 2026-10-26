#!/usr/bin/env node
// Stop hook: sums token usage per model from the session transcript and appends one JSON line to
// <claude dir>/metrics/usage.jsonl (<claude dir> is $CLAUDE_CONFIG_DIR, else ~/.claude).
// It never writes to stdout, swallows every error and always exits 0: a hook must not block Claude.
// Rows are cumulative per session; `agent-workflow ledger --usage` keeps the last row per session_id.
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const GUARD_MS = 4000;

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
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

// Claude Code writes one transcript entry per content block, each repeating the message's usage;
// keeping the last entry per message id counts every API response once.
async function sumTranscript(file) {
  try {
    if (!(await stat(file)).isFile()) return null;
  } catch {
    return null;
  }
  const byMessage = new Map();
  let anonymous = 0;
  const stream = createReadStream(file, { encoding: 'utf8' });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (!line.includes('"assistant"')) continue;
      const entry = parseObject(line);
      const message = entry && entry.type === 'assistant' ? entry.message : null;
      if (!message || typeof message.model !== 'string' || !message.usage || message.model === '<synthetic>') continue;
      const key = typeof message.id === 'string' ? message.id : `#${anonymous++}`;
      byMessage.set(key, { model: message.model, counts: usageCounts(message.usage) });
    }
  } finally {
    stream.destroy();
  }
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
  const models = await sumTranscript(input.transcript_path);
  if (models === null) return;
  const cwd = typeof input.cwd === 'string' && input.cwd !== '' ? input.cwd : process.cwd();
  const root = await findGitRoot(cwd);
  const row = {
    ts: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    project: path.basename(root ?? path.resolve(cwd)),
    session_id: sessionIdOf(input),
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
