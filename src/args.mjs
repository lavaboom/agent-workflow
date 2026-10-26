// Command-line parsing: the command, its options, and the help text. Unknown input is a usage error.
import { parseArgs } from 'node:util';
import { isIsoDate } from './dates.mjs';
import { vendorItemProblem } from './vendor.mjs';

const COMMON_OPTIONS = {
  project: { type: 'string' },
  template: { type: 'string' },
  json: { type: 'boolean' },
  'dry-run': { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
};

const COMMAND_OPTIONS = {
  adopt: { name: { type: 'string' }, 'force-owned': { type: 'boolean' }, 'force-managed': { type: 'boolean' } },
  sync: { 'take-template': { type: 'boolean' }, 'keep-local': { type: 'boolean' }, prune: { type: 'boolean' } },
  check: { 'template-only': { type: 'boolean' } },
  ledger: { since: { type: 'string' }, all: { type: 'boolean' }, usage: { type: 'boolean' } },
  vendor: { from: { type: 'string' }, force: { type: 'boolean' } },
};

// Commands that take positional arguments.
const POSITIONALS = new Set(['vendor']);

export const COMMANDS = Object.keys(COMMAND_OPTIONS);

export const HELP_TEXT = `agent-workflow: install and maintain the agent-workflow pack in a project

Usage: node bin/agent-workflow.mjs <command> [options]
       node bin/agent-workflow.mjs vendor --from <checkout> <item>...

Commands:
  adopt    install the pack into a project (refuses when already adopted)
  sync     update managed files to the current template
  check    lean and freshness checks on a project, or on the template
  ledger   summarise docs/harness/ledger.md
  vendor   copy skills/agents/rules/hooks from a local checkout into .claude/

Options for every command:
  --project <dir>    the project (default: the current directory)
  --template <dir>   the template (default: this repository's template/)
  --json             print a machine-readable result instead of lines
  --dry-run          plan without writing
  -h, --help         print this help

adopt:   --name <project name>  --force-owned  --force-managed
sync:    --take-template  --keep-local  --prune
check:   --template-only
ledger:  --since <YYYY-MM-DD> (default: 7 days ago)  --all  --usage
vendor:  --from <checkout>  --force   items: skills/<name>, agents/<name>.md, rules/<lang>/<file>.md, hooks/<file>

Exit codes: 0 success, 1 refused action or failed check, 2 usage error.
`;

// Returns { kind: 'help' } | { kind: 'error', message } | { kind: 'run', command, options }.
export function parseCommandLine(argv) {
  const [command, ...rest] = argv;
  if (command === undefined) return { kind: 'error', message: 'no command given' };
  if (command === '--help' || command === '-h' || command === 'help') return { kind: 'help' };
  if (!COMMANDS.includes(command)) return { kind: 'error', message: `unknown command "${command}"` };
  let parsed;
  try {
    parsed = parseArgs({ args: rest, options: { ...COMMON_OPTIONS, ...COMMAND_OPTIONS[command] }, strict: true, allowPositionals: POSITIONALS.has(command) });
  } catch (error) {
    return { kind: 'error', message: error.message };
  }
  const values = parsed.values;
  if (values.help) return { kind: 'help' };
  const items = parsed.positionals.map(toForwardSlashItem);
  const problem = validateOptions(command, values) ?? validateItems(command, items);
  if (problem) return { kind: 'error', message: problem };
  return { kind: 'run', command, options: { ...toOptions(values), items } };
}

function validateOptions(command, values) {
  if (command === 'sync' && values['take-template'] && values['keep-local']) {
    return '--take-template and --keep-local cannot be used together';
  }
  if (command === 'ledger' && values.since !== undefined && !isIsoDate(values.since)) {
    return `--since must be an ISO date (YYYY-MM-DD), got "${values.since}"`;
  }
  if (command === 'ledger' && values.since !== undefined && values.all) return '--since and --all cannot be used together';
  if (command === 'adopt' && values.name !== undefined && values.name.trim() === '') return '--name must not be empty';
  if (command === 'vendor' && (values.from === undefined || values.from.trim() === '')) return 'vendor needs --from <checkout>';
  for (const key of ['project', 'template']) {
    if (values[key] !== undefined && values[key].trim() === '') return `--${key} must not be empty`;
  }
  return null;
}

// Items may be typed with backslashes on Windows and with a trailing slash for a directory.
function toForwardSlashItem(item) {
  return item.split('\\').join('/').replace(/\/+$/, '');
}

function validateItems(command, items) {
  if (command !== 'vendor') return null;
  if (items.length === 0) return 'vendor needs at least one item';
  for (const item of items) {
    const problem = vendorItemProblem(item);
    if (problem) return problem;
  }
  return null;
}

function toOptions(values) {
  return {
    project: values.project ?? null,
    template: values.template ?? null,
    json: Boolean(values.json),
    dryRun: Boolean(values['dry-run']),
    name: values.name ?? null,
    forceOwned: Boolean(values['force-owned']),
    forceManaged: Boolean(values['force-managed']),
    takeTemplate: Boolean(values['take-template']),
    keepLocal: Boolean(values['keep-local']),
    prune: Boolean(values.prune),
    templateOnly: Boolean(values['template-only']),
    since: values.since ?? null,
    all: Boolean(values.all),
    usage: Boolean(values.usage),
    from: values.from ?? null,
    force: Boolean(values.force),
  };
}
