// `init`: the old entry file. AGENTS.md moves to docs/project-guide.md with a header block, minus the v1
// pointer paragraph; its Workflow settings table is parsed for the new AGENTS.md.
import { joinLines, lineEnding, splitLines } from './text.mjs';

export const ENTRY_PATH = 'AGENTS.md';
export const GUIDE_PATH = 'docs/project-guide.md';
const POINTER_MARK = 'agent-workflow';

export function guideHeader(date) {
  return [
    `<!-- Moved from AGENTS.md by agent-workflow init on ${date}. This is the project's own guide: what it is,`,
    '     how it is built, its rules. The v2 entry file AGENTS.md stays under 100 lines and points here; the',
    '     rules that bite are split into .claude/rules/ (path-scoped) and docs/ topic files by hand. -->',
  ];
}

// Returns { text, droppedParagraphs } for docs/project-guide.md, in the old file's line endings.
export function guideText(entryText, date) {
  const eol = lineEnding(entryText);
  const { lines, dropped } = dropPointerParagraphs(splitLines(entryText));
  return { text: joinLines([...guideHeader(date), '', ...lines], eol), droppedParagraphs: dropped };
}

// The paragraphs before the first ## heading that mention agent-workflow are the v1 pointer: dropped,
// with the blank lines after them. Headings, and everything from the first ## heading on, stay.
export function dropPointerParagraphs(lines) {
  const firstSection = lines.findIndex((line) => /^#{2,}\s/.test(line.trim()));
  const preambleEnd = firstSection < 0 ? lines.length : firstSection;
  const kept = [];
  let dropped = 0;
  for (const block of preambleBlocks(lines.slice(0, preambleEnd))) {
    if (block.droppable && block.lines.some((line) => line.includes(POINTER_MARK))) {
      dropped += 1;
      continue;
    }
    kept.push(...block.lines);
  }
  return { lines: [...kept, ...lines.slice(preambleEnd)], dropped };
}

// Splits the preamble into blocks: a heading line, a paragraph with the blank lines that follow it, or a
// run of blank lines. A paragraph runs to the next blank line, except inside a fence or an HTML comment.
function preambleBlocks(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const start = i;
    if (lines[i].trim() === '') {
      while (i < lines.length && lines[i].trim() === '') i += 1;
      blocks.push({ droppable: false, lines: lines.slice(start, i) });
      continue;
    }
    if (/^#\s/.test(lines[i].trim())) {
      i += 1;
      blocks.push({ droppable: false, lines: lines.slice(start, i) });
      continue;
    }
    i = paragraphEnd(lines, i);
    while (i < lines.length && lines[i].trim() === '') i += 1;
    blocks.push({ droppable: true, lines: lines.slice(start, i) });
  }
  return blocks;
}

function paragraphEnd(lines, start) {
  let fence = null;
  let inComment = false;
  let i = start;
  for (; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (fence === null && !inComment && (trimmed === '' || (i > start && /^#\s/.test(trimmed)))) break;
    if (fence !== null) {
      if (trimmed.startsWith(fence) && i > start) fence = null;
    } else if (inComment) {
      if (trimmed.includes('-->')) inComment = false;
    } else if (/^(```+|~~~+)/.test(trimmed)) {
      fence = /^(```+|~~~+)/.exec(trimmed)[1];
    } else if (trimmed.includes('<!--') && !trimmed.slice(trimmed.lastIndexOf('<!--')).includes('-->')) {
      inComment = true;
    }
  }
  return i;
}
