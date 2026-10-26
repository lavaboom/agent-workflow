// Entry logic for bin/agent-workflow.mjs: parse, build the command's inputs, run it, print, return the exit code.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAdopt } from './adopt.mjs';
import { HELP_TEXT, parseCommandLine } from './args.mjs';
import { runCheck } from './check.mjs';
import { isDirectory } from './files.mjs';
import { runLedger } from './ledger.mjs';
import { renderResult } from './report.mjs';
import { runSync } from './sync.mjs';
import { runVendor } from './vendor.mjs';
import { claudeDir } from './usage.mjs';

export const DEFAULT_TEMPLATE_DIR = fileURLToPath(new URL('../template', import.meta.url));
export const BIN_PATH = fileURLToPath(new URL('../bin/agent-workflow.mjs', import.meta.url));

// What {{HARNESS_CLI}} becomes in owned files: this CLI's entry point, with forward slashes
// (quoted when the path holds whitespace, so the command still runs).
export function harnessCliCommand(binPath) {
  const forward = binPath.split(path.sep).join('/');
  return /\s/.test(forward) ? `node "${forward}"` : `node ${forward}`;
}

const RUNNERS = { adopt: runAdopt, sync: runSync, check: runCheck, ledger: runLedger, vendor: runVendor };

// io: { stdout, stderr (writable-like with write()), cwd, env, homeDir, now: () => Date }
export async function main(argv, io) {
  const parsed = parseCommandLine(argv);
  if (parsed.kind === 'help') {
    io.stdout.write(HELP_TEXT);
    return 0;
  }
  if (parsed.kind === 'error') {
    io.stderr.write(`error: ${parsed.message}\n\n${HELP_TEXT}`);
    return 2;
  }
  const inputs = commandInputs(parsed.options, io);
  if (!(await isDirectory(inputs.projectDir))) return refuseEarly(io, parsed, `project directory not found: ${inputs.projectDir}`);
  let result;
  try {
    result = await RUNNERS[parsed.command](inputs);
  } catch (error) {
    return refuseEarly(io, parsed, error.message);
  }
  writeOutput(io, renderResult(result, { json: parsed.options.json }));
  return result.exitCode;
}

export function commandInputs(options, io) {
  return {
    ...options,
    projectDir: path.resolve(io.cwd, options.project ?? '.'),
    from: options.from ? path.resolve(io.cwd, options.from) : null,
    templateDir: options.template ? path.resolve(io.cwd, options.template) : DEFAULT_TEMPLATE_DIR,
    claudeDir: claudeDir(io.env, io.homeDir ?? os.homedir()),
    harnessCli: harnessCliCommand(BIN_PATH),
    now: io.now(),
  };
}

function refuseEarly(io, parsed, message) {
  const result = { command: parsed.command, ok: false, exitCode: 1, errors: [message] };
  if (parsed.options.json) writeOutput(io, renderResult(result, { json: true }));
  else io.stderr.write(`error: ${message}\n`);
  return 1;
}

function writeOutput(io, output) {
  if (output.stdout.length > 0) io.stdout.write(`${output.stdout.join('\n')}\n`);
  if (output.stderr.length > 0) io.stderr.write(`${output.stderr.join('\n')}\n`);
}
