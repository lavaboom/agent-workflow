// The real entry point run as a child process, and the CI check of the repository template.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIN, FIXTURE_TEMPLATE, runCli, runNode } from './helpers/setup.mjs';

describe('bin/agent-workflow.mjs', () => {
  it('--help lists the commands and options and exits 0', async () => {
    const run = await runNode(BIN, ['--help']);
    assert.equal(run.code, 0);
    for (const word of ['adopt', 'sync', 'check', 'ledger', '--project', '--template', '--json', '--dry-run', '--force-owned', '--force-managed', '--take-template', '--keep-local', '--prune', '--template-only', '--since', '--all', '--usage', '--name']) {
      assert.ok(run.stdout.includes(word), word);
    }
  });

  it('exits 2 on an unknown command, a missing command and an unknown option', async () => {
    const unknown = await runNode(BIN, ['frobnicate']);
    assert.equal(unknown.code, 2);
    assert.match(unknown.stderr, /unknown command "frobnicate"/);
    assert.equal((await runNode(BIN, [])).code, 2);
    const badOption = await runNode(BIN, ['check', '--force-owned']);
    assert.equal(badOption.code, 2);
    assert.equal((await runNode(BIN, ['adopt', 'extra-positional'])).code, 2);
  });

  it('prints command help with exit 0', async () => {
    const run = await runNode(BIN, ['sync', '--help']);
    assert.equal(run.code, 0);
    assert.match(run.stdout, /Commands:/);
  });

  it('runs check --template-only against the fixture template', async () => {
    const run = await runNode(BIN, ['check', '--template-only', '--template', FIXTURE_TEMPLATE]);
    assert.equal(run.code, 0, run.stdout);
    assert.match(run.stdout, /template checks: \d+ ok, 0 warn, 0 fail/);
  });

  it('passes check --template-only on this repository\'s template/ (the default template)', async () => {
    const run = await runCli(['check', '--template-only']);
    assert.equal(run.code, 0, run.stdout);
    assert.match(run.stdout, /template checks: \d+ ok, \d+ warn, 0 fail/);
  });

  it('exits 1 for a project directory that does not exist', async () => {
    const run = await runNode(BIN, ['check', '--project', 'no/such/dir', '--template', FIXTURE_TEMPLATE]);
    assert.equal(run.code, 1);
    assert.match(run.stderr, /project directory not found/);
  });
});
