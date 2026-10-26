// `init`: a kept v1 board gets the two mandatory lines the v2 board starts with.
import { joinLines, lineEnding, splitLines } from './text.mjs';

export { BOARD_PATH } from './check-project.mjs';
export const BOARD_LABELS = ['Next step:', 'Current issues:'];

// A board "has" a label when one of its lines starts with it (inside the fenced block or not).
export function missingBoardLabels(text) {
  const lines = splitLines(text).map((line) => line.trim());
  return BOARD_LABELS.filter((label) => !lines.some((line) => line.startsWith(label)));
}

// Returns { text, added: [labels] }. The missing lines go in one fenced block after the first heading
// line (at the top when there is no heading): a blank line, the fence, then a blank line unless the
// board already has one there.
export function ensureBoardLines(text) {
  const added = missingBoardLabels(text);
  if (added.length === 0) return { text, added };
  const eol = lineEnding(text);
  const lines = splitLines(text);
  const heading = lines.findIndex((line) => /^#{1,6}\s/.test(line.trim()));
  const at = heading < 0 ? 0 : heading + 1;
  const block = ['```', ...added.map((label) => `${label} <fill in>`), '```'];
  const before = heading < 0 ? [] : [''];
  const after = lines[at] !== undefined && lines[at].trim() === '' ? [] : [''];
  lines.splice(at, 0, ...before, ...block, ...after);
  return { text: joinLines(lines, eol), added };
}
