// `check`: runs the project checks, or the template checks with --template-only, and sets the exit code.
import { runProjectChecks } from './check-project.mjs';
import { runTemplateChecks } from './check-template.mjs';
import { utcDateString } from './dates.mjs';

// options: { projectDir, templateDir, now, templateOnly }
export async function runCheck(options) {
  const today = utcDateString(options.now);
  const results = options.templateOnly
    ? await runTemplateChecks({ templateDir: options.templateDir, today })
    : await runProjectChecks({ projectDir: options.projectDir, templateDir: options.templateDir, today });
  const counts = countLevels(results);
  return {
    command: 'check',
    mode: options.templateOnly ? 'template' : 'project',
    ok: counts.fail === 0,
    exitCode: counts.fail === 0 ? 0 : 1,
    counts,
    results,
    errors: [],
  };
}

export function countLevels(results) {
  const counts = { ok: 0, warn: 0, fail: 0 };
  for (const result of results) counts[result.level] += 1;
  return counts;
}
