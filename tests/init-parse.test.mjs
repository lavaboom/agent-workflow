// The pure parts of `init`: the settings table, the pointer paragraph, the board lines, .gitignore.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ensureBoardLines, missingBoardLabels } from '../src/init-board.mjs';
import { dropPointerParagraphs, guideText } from '../src/init-entry.mjs';
import { mergeGitignore } from '../src/init-gitignore.mjs';
import { fillEntryFile, normaliseSettingName, parseWorkflowSettings, projectSetting } from '../src/init-settings.mjs';
import { isV1ImportFile, isV1PointerFile } from '../src/init-v1.mjs';
import { initNextSteps } from '../src/init.mjs';
import { V1_AGENTS } from './helpers/v1-project.mjs';
import { toCrlf } from './helpers/setup.mjs';

const valueOf = (settings, name) => settings.find((setting) => setting.name === name)?.value;

describe('init: setting names', () => {
  it('strips parentheses and backticks; keeps a dated parenthetical for the value', () => {
    assert.deepEqual(normaliseSettingName('Hard areas (`opus-xhigh`)'), { name: 'Hard areas', prefix: '' });
    assert.deepEqual(normaliseSettingName('Who pushes (owner, 2026-10-22)'), { name: 'Who pushes', prefix: '(owner, 2026-10-22) ' });
    assert.deepEqual(normaliseSettingName('Branch database (a task with a migration)'), { name: 'Branch database', prefix: '' });
    assert.deepEqual(normaliseSettingName('`Gate`'), { name: 'Gate', prefix: '' });
  });
});

describe('init: the Workflow settings table', () => {
  for (const eol of ['lf', 'crlf']) {
    it(`reads only the table under the Workflow settings heading (${eol})`, () => {
      const parsed = parseWorkflowSettings(eol === 'crlf' ? toCrlf(V1_AGENTS) : V1_AGENTS);
      assert.equal(parsed.found, true);
      assert.equal(parsed.settings.length, 14);
      assert.equal(valueOf(parsed.settings, 'Gate'), '`npm run test:local`');
      assert.equal(valueOf(parsed.settings, 'Merge'), '`npm run merge:batch -- <branch> [<branch> …]`');
      assert.equal(valueOf(parsed.settings, 'Who pushes'), '(owner, 2026-10-22) only the owner; a push deploys staging');
      assert.equal(valueOf(parsed.settings, 'Hard areas'), 'money math, RLS or migration design');
      assert.equal(valueOf(parsed.settings, 'Main checkout'), '`C:\\code\\Demo`');
      assert.equal(valueOf(parsed.settings, 'Gate log'), '`npm run gate:log \\| tail`');
      assert.equal(projectSetting(parsed.settings), 'Demo');
      for (const setting of parsed.settings) assert.doesNotMatch(setting.value, /\r/);
    });
  }

  it('finds no table when there is no Workflow settings heading, or only a fenced example', () => {
    assert.equal(parseWorkflowSettings('# X\n\n| Setting | Value |\n|---|---|\n| Gate | a |\n').found, false);
    const fenced = '# X\n\n## Workflow settings\n\n```\n| Setting | Value |\n|---|---|\n| Gate | a |\n```\n';
    assert.equal(parseWorkflowSettings(fenced).found, false);
  });

  it('fills matching v2 rows, never Harness CLI, never with an unfilled v1 placeholder', () => {
    const v2 = '# {{PROJECT}}\n\n| Tier | Commands |\n|---|---|\n| `docs` | <x> |\n\n## Workflow settings\n\n| Setting | Value |\n|---|---|\n'
      + '| Gate | <the gate> |\n| Capacity | <capacity> |\n| Harness CLI | `node cli` |\n| Phase | <phase> |\n';
    const settings = [
      { name: 'Gate', value: '`npm run gate`' }, { name: 'Capacity', value: '<the command>' },
      { name: 'Harness CLI', value: 'old' }, { name: 'Builder checks', value: '`npm test`' }, { name: 'Custom', value: 'x' },
    ];
    const filled = fillEntryFile(v2, settings, 'Demo');
    const lines = filled.text.split('\n');
    assert.equal(lines[0], '# Demo');
    assert.equal(lines[4], '| `docs` | <x> |');
    assert.equal(lines[5], '<!-- v1 Builder checks: `npm test` ; split these into the tier rows above -->');
    assert.ok(lines.includes('| Gate | `npm run gate` |'));
    assert.ok(lines.includes('| Capacity | <capacity> |'));
    assert.ok(lines.includes('| Harness CLI | `node cli` |'));
    assert.deepEqual(filled.filled, [{ name: 'Gate', value: '`npm run gate`' }]);
    assert.deepEqual(filled.unmatched, ['Custom']);
  });
});

describe('init: the guide', () => {
  it('drops the preamble paragraphs that mention agent-workflow, nothing after the first ## heading', () => {
    const text = '# AGENTS.md\nread `C:/code/agent-workflow/WORKFLOW.md` first.\n\nOwn intro.\n\n## Rules\n\nSee agent-workflow docs.\n';
    const { lines, dropped } = dropPointerParagraphs(text.split('\n').slice(0, -1));
    assert.equal(dropped, 1);
    assert.deepEqual(lines, ['# AGENTS.md', 'Own intro.', '', '## Rules', '', 'See agent-workflow docs.']);
  });

  it('keeps a multi-paragraph HTML comment whole and prepends the header in the file\'s line endings', () => {
    const text = toCrlf('# T\n\n<!-- a\n\nagent-workflow b -->\n\nKeep.\n\n## S\n');
    const guide = guideText(text, '2026-10-26');
    assert.ok(guide.text.startsWith('<!-- Moved from AGENTS.md by agent-workflow init on 2026-10-26. This is the project\'s own guide: what it is,\r\n'));
    assert.equal(guide.droppedParagraphs, 1);
    assert.ok(guide.text.endsWith('-->\r\n\r\n# T\r\n\r\nKeep.\r\n\r\n## S\r\n'), JSON.stringify(guide.text));
  });
});

describe('init: v1 files, board, .gitignore, next steps', () => {
  it('recognises the v1 import file and pointer files only', () => {
    assert.equal(isV1ImportFile('@a.md\r\n\r\n  @AGENTS.md\r\n'), true);
    assert.equal(isV1ImportFile('@AGENTS.md\nAlso read the guide.\n'), false);
    assert.equal(isV1ImportFile('\n\n'), false);
    assert.equal(isV1PointerFile('see C:/code/agent-workflow/TASKS.md'), true);
    assert.equal(isV1PointerFile('# Tasks\n\nour own'), false);
  });

  it('inserts the missing board lines after the first heading, in the file\'s line endings', () => {
    const both = ensureBoardLines('# Board\n\nText.\n');
    assert.deepEqual(both.added, ['Next step:', 'Current issues:']);
    assert.equal(both.text, '# Board\n\n```\nNext step: <fill in>\nCurrent issues: <fill in>\n```\n\nText.\n');
    const one = ensureBoardLines(toCrlf('# Board\nNext step: x\n'));
    assert.equal(one.text, toCrlf('# Board\n\n```\nCurrent issues: <fill in>\n```\n\nNext step: x\n'));
    assert.deepEqual(missingBoardLabels('# B\nsee "Next step: later" in prose\nCurrent issues: none\n'), ['Next step:']);
    assert.deepEqual(ensureBoardLines('Next step: a\nCurrent issues: b\n').added, []);
  });

  it('merges .gitignore.harness lines that are missing, keeping CRLF', () => {
    const merged = mergeGitignore('node_modules/\r\n.claude/worktrees/', '# h\n.claude/worktrees/\n\n.claude/settings.local.json\n');
    assert.deepEqual(merged.added, ['# h', '.claude/settings.local.json']);
    assert.equal(merged.text, 'node_modules/\r\n.claude/worktrees/\r\n# h\r\n.claude/settings.local.json\r\n');
    assert.equal(mergeGitignore(null, 'a\n').text, 'a\n');
    assert.deepEqual(mergeGitignore('a\n', 'a\n'), { text: 'a\n', added: [] });
  });

  it('puts step 0 before step 1 when the guide was written', () => {
    assert.equal(initNextSteps('Head:\r\n\r\n  1. one\r\n  2. two\r\n', true), 'Head:\n\n  0. docs/project-guide.md holds the old AGENTS.md: split its rules into .claude/rules/ and docs/, then trim it\n  1. one\n  2. two');
    assert.equal(initNextSteps('Head:\n  1. one\n', false), 'Head:\n  1. one');
  });
});
