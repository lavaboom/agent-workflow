#!/usr/bin/env node
// agent-workflow CLI: adopt, sync, check, ledger. See docs/design/cli-spec.md and src/README.md.
import os from 'node:os';
import { main } from '../src/cli.mjs';

const exitCode = await main(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
  cwd: process.cwd(),
  env: process.env,
  homeDir: os.homedir(),
  now: () => new Date(),
});
process.exitCode = exitCode;
