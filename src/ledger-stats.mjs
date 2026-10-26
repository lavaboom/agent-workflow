// Pure statistics over parsed ledger rows (see table.mjs). Claude and Codex builds are kept apart.

export const DEFAULT_MODELS = { claude: ['sonnet', 'opus'], codex: ['luna', 'sol'] };
export const TIERS = ['docs', 'static', 'unit', 'integration', 'e2e'];
export const FAILURE_LAYERS = ['spec', 'context', 'verification', 'environment', 'state', 'capability'];
const OVERKILL_TIERS = new Set(['docs', 'static', 'unit']);
const OVERKILL_MODEL = /\b(opus|sol)\b/i;

// window: { since, until, all }. since/until are ISO dates, inclusive.
export function summarizeLedger(rows, window) {
  const ordered = sortByDate(rows);
  const inWindow = (date) => window.all || (date >= window.since && date <= window.until);
  const windowRows = ordered.filter((row) => inWindow(row.date));
  const builtTasks = profileTasks(ordered).filter((task) => inWindow(task.date));
  return {
    from: window.all ? (ordered[0]?.date ?? window.until) : window.since,
    to: window.until,
    all: Boolean(window.all),
    rowCount: windowRows.length,
    taskCount: new Set(windowRows.map((row) => row.task)).size,
    builds: buildCounts(windowRows),
    firstPass: perModel(builtTasks, firstPassFor),
    fixRounds: perModel(builtTasks, fixRoundsFor),
    fixRoundsByTier: TIERS.map((tier) => ({ tier, ...meanFixRounds(builtTasks.filter((task) => task.tier === tier)) })),
    escalations: escalations(windowRows),
    failureLayers: failureLayers(windowRows),
    overkill: overkillCandidates(builtTasks),
  };
}

// Stable sort: rows of the same date keep their order in the file.
function sortByDate(rows) {
  return rows.map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.date < b.row.date ? -1 : a.row.date > b.row.date ? 1 : a.index - b.index))
    .map((item) => item.row);
}

// One profile per task that has a build: its first build (model, tool, tier), its first review, its fix rows.
export function profileTasks(orderedRows) {
  const byTask = new Map();
  for (const row of orderedRows) {
    if (!byTask.has(row.task)) byTask.set(row.task, []);
    byTask.get(row.task).push(row);
  }
  const profiles = [];
  for (const [task, taskRows] of byTask) {
    const build = taskRows.find((row) => row.step === 'build');
    if (!build) continue;
    const firstReview = taskRows.find((row) => row.step === 'review') ?? null;
    profiles.push({
      task,
      date: build.date,
      tool: build.tool,
      model: build.model,
      tier: build.tier,
      firstReviewOutcome: firstReview ? firstReview.outcome : null,
      fixRounds: taskRows.filter((row) => row.step === 'fix').length,
    });
  }
  return profiles;
}

// Models in display order: the tool's defaults first, then the rest by count (descending) and name.
export function orderModels(tool, counts) {
  const defaults = DEFAULT_MODELS[tool];
  const others = [...counts.keys()].filter((model) => !defaults.includes(model))
    .sort((a, b) => counts.get(b) - counts.get(a) || (a < b ? -1 : 1));
  return [...defaults, ...others];
}

function buildCounts(windowRows) {
  const result = {};
  for (const tool of ['claude', 'codex']) {
    const counts = countBy(windowRows.filter((row) => row.step === 'build' && row.tool === tool), (row) => row.model);
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    result[tool] = orderModels(tool, counts).map((model) => {
      const count = counts.get(model) ?? 0;
      return { model, count, percent: total === 0 ? 0 : Math.round((count * 100) / total) };
    });
  }
  return result;
}

// Per tool, per model with at least one built task: compute(tasksOfThatModel).
function perModel(tasks, compute) {
  const result = {};
  for (const tool of ['claude', 'codex']) {
    const toolTasks = tasks.filter((task) => task.tool === tool);
    const counts = countBy(toolTasks, (task) => task.model);
    result[tool] = orderModels(tool, counts).filter((model) => counts.has(model))
      .map((model) => ({ model, ...compute(toolTasks.filter((task) => task.model === model)) }));
  }
  return result;
}

// Denominator: built tasks that have had a review.
function firstPassFor(tasks) {
  const reviewed = tasks.filter((task) => task.firstReviewOutcome !== null);
  const approved = reviewed.filter((task) => task.firstReviewOutcome === 'approve').length;
  return { approved, reviewed: reviewed.length, percent: reviewed.length === 0 ? null : Math.round((approved * 100) / reviewed.length) };
}

function fixRoundsFor(tasks) {
  return meanFixRounds(tasks);
}

function meanFixRounds(tasks) {
  const fixes = tasks.reduce((sum, task) => sum + task.fixRounds, 0);
  return { tasks: tasks.length, fixes, mean: tasks.length === 0 ? 0 : fixes / tasks.length };
}

function escalations(windowRows) {
  const escalated = windowRows.filter((row) => row.step === 'review' && row.outcome === 'escalated');
  return { count: escalated.length, tasks: [...new Set(escalated.map((row) => row.task))] };
}

// Layers of rows whose outcome is `fix` (a review that sent the work back).
function failureLayers(windowRows) {
  const counts = Object.fromEntries(FAILURE_LAYERS.map((layer) => [layer, 0]));
  for (const row of windowRows) {
    if (row.step === 'review' && row.outcome === 'fix' && row.layer in counts) counts[row.layer] += 1;
  }
  return counts;
}

function overkillCandidates(tasks) {
  const candidates = tasks.filter((task) => OVERKILL_MODEL.test(task.model) && OVERKILL_TIERS.has(task.tier) && task.firstReviewOutcome === 'approve');
  return { count: candidates.length, tasks: candidates.map((task) => task.task), models: [...new Set(candidates.map((task) => task.model))] };
}

function countBy(items, keyOf) {
  const counts = new Map();
  for (const item of items) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
  return counts;
}
