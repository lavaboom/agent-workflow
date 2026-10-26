import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { parseLedger } from '../src/table.mjs';
import { formatTokens } from '../src/usage.mjs';
import { FIXTURES_DIR, makeProject, makeTempDir, nativeIn, removeTempDirs, runCli, toCrlf, writeText } from './helpers/setup.mjs';

const FIXTURE_LEDGER = path.join(FIXTURES_DIR, 'ledger', 'ledger.md');

after(removeTempDirs);

async function projectWithLedger(transform = (text) => text) {
  const project = await makeProject('demo-project');
  await writeText(nativeIn(project, 'docs/harness/ledger.md'), transform(await readFile(FIXTURE_LEDGER, 'utf8')));
  return project;
}

const WINDOW_LINES = [
  'Ledger 2026-10-19 → 2026-10-26 (20 rows, 7 tasks)',
  'Builds by model:      sonnet 3 (60 %)  opus 1 (20 %)  haiku 1 (20 %)  — codex luna 1, sol 1',
  'First-pass approval:  sonnet 1/3 (33 %)  opus 1/1 (100 %)  haiku 0/0 (n/a)  — codex luna 1/1 (100 %), sol 1/1 (100 %)',
  'Fix rounds per task:  sonnet 1.00  opus 0.00  haiku 0.00  — codex luna 0.00, sol 0.00     by tier: docs 0.0 static 0.0 unit 0.5 integration 2.0 e2e 0.0',
  'Escalations:          1 (task-004)',
  'Failure layers (fix): spec 1  context 1  verification 1  environment 0  state 0  capability 0',
  'Overkill candidates:  2 opus/sol builds approved first pass on docs/static/unit: task-003, task-006',
];

describe('ledger', () => {
  it('prints every summary line with known numbers for --since', async () => {
    const project = await projectWithLedger();
    const run = await runCli(['ledger', '--project', project, '--since', '2026-10-19']);
    assert.equal(run.code, 0, run.stderr);
    assert.deepEqual(run.stdout.trimEnd().split('\n'), WINDOW_LINES);
  });

  it('defaults to the last 7 days and tolerates CRLF', async () => {
    const project = await projectWithLedger(toCrlf);
    const run = await runCli(['ledger', '--project', project]);
    assert.equal(run.code, 0, run.stderr);
    assert.deepEqual(run.stdout.trimEnd().split('\n'), WINDOW_LINES);
  });

  it('--all covers every row', async () => {
    const project = await projectWithLedger();
    const run = await runCli(['ledger', '--project', project, '--all']);
    const lines = run.stdout.trimEnd().split('\n');
    assert.equal(lines[0], 'Ledger 2026-10-10 → 2026-10-26 (22 rows, 8 tasks)');
    assert.equal(lines[1], 'Builds by model:      sonnet 3 (50 %)  opus 2 (33 %)  haiku 1 (17 %)  — codex luna 1, sol 1');
    assert.equal(lines[6], 'Overkill candidates:  3 opus/sol builds approved first pass on docs/static/unit: task-000, task-003, task-006');
  });

  it('counts Codex rows in their own columns', async () => {
    const project = await projectWithLedger();
    const run = await runCli(['ledger', '--project', project, '--since', '2026-10-19', '--json']);
    const { summary } = JSON.parse(run.stdout);
    assert.deepEqual(summary.builds.codex, [{ model: 'luna', count: 1, percent: 50 }, { model: 'sol', count: 1, percent: 50 }]);
    assert.equal(summary.builds.claude.reduce((sum, item) => sum + item.count, 0), 5);
    assert.deepEqual(summary.firstPass.codex.map((item) => item.model), ['luna', 'sol']);
    assert.deepEqual(summary.escalations, { count: 1, tasks: ['task-004'] });
  });

  it('prints the summary line shape with no Codex builds and no rows', async () => {
    const project = await makeProject();
    await writeText(nativeIn(project, 'docs/harness/ledger.md'), '## Rows\n\n| date | task | step | role | tool | model | effort | tier | round | outcome | layer | note |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n');
    const run = await runCli(['ledger', '--project', project]);
    assert.equal(run.code, 0, run.stderr);
    assert.deepEqual(run.stdout.trimEnd().split('\n'), [
      'Ledger 2026-10-19 → 2026-10-26 (0 rows, 0 tasks)',
      'Builds by model:      sonnet 0 (0 %)  opus 0 (0 %)  — codex luna 0, sol 0',
      'First-pass approval:  none',
      'Fix rounds per task:  none     by tier: docs 0.0 static 0.0 unit 0.0 integration 0.0 e2e 0.0',
      'Escalations:          0',
      'Failure layers (fix): spec 0  context 0  verification 0  environment 0  state 0  capability 0',
      'Overkill candidates:  0 opus builds approved first pass on docs/static/unit',
    ]);
  });

  it('exits 1 on a malformed row but still summarises the good rows', async () => {
    const project = await projectWithLedger((text) => text.replace('## Notes', '| 2026-10-25 | task-9 | build |\n\n## Notes'));
    const run = await runCli(['ledger', '--project', project, '--since', '2026-10-19']);
    assert.equal(run.code, 1);
    assert.equal(run.stdout.trimEnd().split('\n')[0], WINDOW_LINES[0]);
    assert.match(run.stderr, /ledger\.md line \d+: expected 12 cells, found 3 \(row ignored\)/);
  });

  it('exits 1 when the ledger is missing', async () => {
    const project = await makeProject();
    const run = await runCli(['ledger', '--project', project]);
    assert.equal(run.code, 1);
    assert.match(run.stderr, /docs\/harness\/ledger\.md missing/);
  });

  it('rejects a bad --since as a usage error', async () => {
    const project = await projectWithLedger();
    assert.equal((await runCli(['ledger', '--project', project, '--since', 'last week'])).code, 2);
  });

  it('--usage keeps the last row per session, for this project and window', async () => {
    const project = await projectWithLedger();
    const claudeDir = await makeTempDir('aw-claude-');
    const row = (ts, project, session, models) => JSON.stringify({ ts, project, session_id: session, models });
    const usage = [
      row('2026-10-20T10:00:00Z', 'demo-project', 's1', { 'claude-sonnet-5-5': { input: 100, output: 10, cache_read: 1000, cache_write: 0 } }),
      row('2026-10-20T11:00:00Z', 'demo-project', 's1', { 'claude-sonnet-5-5': { input: 200, output: 20, cache_read: 2000, cache_write: 100 } }),
      row('2026-10-21T09:00:00Z', 'demo-project', 's2', {
        'claude-opus-5-5': { input: 1000, output: 500, cache_read: 500000, cache_write: 500000 },
        'claude-haiku-4-5': { input: 9000, output: 9000, cache_read: 0, cache_write: 0 },
      }),
      row('2026-10-21T09:00:00Z', 'other-project', 's3', { 'claude-opus-5-5': { input: 5, output: 5, cache_read: 0, cache_write: 0 } }),
      row('2026-10-01T09:00:00Z', 'demo-project', 's4', { 'claude-opus-5-5': { input: 5, output: 5, cache_read: 0, cache_write: 0 } }),
      '{"truncated":',
    ].join('\r\n');
    await writeText(path.join(claudeDir, 'metrics', 'usage.jsonl'), usage);
    const run = await runCli(['ledger', '--project', project, '--usage'], { env: { CLAUDE_CONFIG_DIR: claudeDir } });
    assert.equal(run.code, 0, run.stderr);
    const lines = run.stdout.trimEnd().split('\n');
    assert.equal(lines.length, 8);
    assert.equal(lines[7], 'Usage (this machine): opus 1M in / 500 out · sonnet 2.3k in / 20 out · haiku 9k in / 9k out  (2 sessions)');
  });

  it('--usage says so when there is no usage log', async () => {
    const project = await projectWithLedger();
    const claudeDir = await makeTempDir('aw-claude-');
    const run = await runCli(['ledger', '--project', project, '--usage'], { env: { CLAUDE_CONFIG_DIR: claudeDir } });
    assert.equal(run.code, 0);
    assert.match(run.stdout, /^Usage \(this machine\): no usage log at /m);
  });
});

describe('parseLedger', () => {
  const header = '## Rows\n| date | task | step | role | tool | model | effort | tier | round | outcome | layer | note |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';

  it('parses a row, trimming cells and lower-casing enums', () => {
    const parsed = parseLedger(`${header}|  2026-10-20 | task-001 | Build | builder | claude | Sonnet | high | docs | 1 | built | none | a note |\n`);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.rows[0].step, 'build');
    assert.equal(parsed.rows[0].model, 'Sonnet');
    assert.equal(parsed.rows[0].round, 1);
    assert.equal(parsed.rows[0].line, 4);
  });

  it('reports unknown enums, bad dates and bad rounds with the line number', () => {
    const parsed = parseLedger(`${header}| 2026-13-01 | task-001 | build | builder | gpt | sonnet | high | docs | 0 | built | none | |\n`);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.errors[0].line, 4);
    assert.match(parsed.errors[0].message, /date "2026-13-01" is not an ISO date/);
    assert.match(parsed.errors[0].message, /round "0" is not a positive integer/);
    assert.match(parsed.errors[0].message, /unknown tool "gpt"/);
  });

  it('accepts exactly the outcomes each step allows', () => {
    const row = (step, outcome) => `| 2026-10-20 | task-001 | ${step} | builder | claude | sonnet | high | docs | 1 | ${outcome} | none | |`;
    const valid = [['build', 'built'], ['build', 'blocked'], ['build', 'abandoned'], ['fix', 'built'], ['fix', 'blocked'], ['fix', 'abandoned'],
      ['review', 'approve'], ['review', 'fix'], ['review', 'escalated'], ['close', 'done']];
    const accepted = parseLedger(`${header}${valid.map(([step, outcome]) => row(step, outcome)).join('\n')}\n`);
    assert.equal(accepted.ok, true, JSON.stringify(accepted.errors));
    assert.equal(accepted.rows.length, valid.length);
    const invalid = [['build', 'approve'], ['build', 'done'], ['fix', 'escalated'], ['review', 'built'], ['review', 'done'], ['close', 'approve']];
    const refused = parseLedger(`${header}${invalid.map(([step, outcome]) => row(step, outcome)).join('\n')}\n`);
    assert.equal(refused.errors.length, invalid.length);
    assert.match(refused.errors[0].message, /^outcome "approve" is not valid on a build row \(built, blocked, abandoned\)$/);
    assert.equal(refused.errors[0].line, 4);
    assert.match(refused.errors[5].message, /^outcome "approve" is not valid on a close row \(done\)$/);
  });

  it('reports a missing heading and a wrong header', () => {
    assert.match(parseLedger('# Ledger\n').errors[0].message, /no "## Rows" heading/);
    assert.match(parseLedger('## Rows\n| date | task |\n').errors[0].message, /table header must be/);
  });
});

describe('formatTokens', () => {
  it('formats the spec examples', () => {
    assert.deepEqual([950, 2300, 9000, 85000, 210000, 1200000, 3400000].map(formatTokens), ['950', '2.3k', '9k', '85k', '210k', '1.2M', '3.4M']);
  });
});
