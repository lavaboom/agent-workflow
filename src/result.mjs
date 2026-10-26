// The result object every command returns, and the plan actions that write a file.

// Actions whose plan item carries bytes to write at its path.
export const WRITTEN_ACTIONS = new Set(['create', 'update', 'overwritten']);

// A refused result to start from; fields adds the command's own keys. A command calls succeed() when done.
export function commandResult(command, options, fields = {}) {
  return { command, ok: false, exitCode: 1, dryRun: Boolean(options.dryRun), ...fields, errors: [] };
}

export function refuse(result, ...messages) {
  result.errors.push(...messages);
  return result;
}

export function succeed(result) {
  result.ok = true;
  result.exitCode = 0;
  return result;
}
