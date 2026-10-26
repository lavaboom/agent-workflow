// Reads the header block of a rule or topic doc: YAML frontmatter at the top and/or HTML comments
// that come before the first line of body text (blank lines and headings may precede them).
import { splitLines } from './text.mjs';

const META_KEY = /^\s*(?:<!--)?\s*(?:[-*]\s+)?(source|applies|review-by)\s*:\s*(.*?)\s*(?:-->)?\s*$/i;
const PATHS_KEY = /^paths\s*:/;

// Returns { hasFrontmatter, hasPaths, source, applies, reviewBy } with null for missing values.
export function readHeader(text) {
  const lines = splitLines(text);
  const frontmatter = readFrontmatter(lines);
  const comments = readLeadingComments(lines, frontmatter ? frontmatter.end : 0);
  const headerLines = [...(frontmatter ? frontmatter.lines : []), ...comments];
  const meta = { source: null, applies: null, 'review-by': null };
  for (const line of headerLines) {
    const match = META_KEY.exec(line);
    if (match && meta[match[1].toLowerCase()] === null) meta[match[1].toLowerCase()] = unquote(match[2]);
  }
  return {
    hasFrontmatter: frontmatter !== null,
    hasPaths: frontmatter !== null && frontmatter.lines.some((line) => PATHS_KEY.test(line)),
    source: meta.source,
    applies: meta.applies,
    reviewBy: meta['review-by'],
  };
}

export function missingMetadataKeys(header) {
  const missing = [];
  if (header.source === null) missing.push('source:');
  if (header.applies === null) missing.push('applies:');
  if (header.reviewBy === null) missing.push('review-by:');
  return missing;
}

// The ISO date at the start of a review-by value, or null when the value is not a date.
export function reviewByDate(header) {
  const match = /^(\d{4}-\d{2}-\d{2})\b/.exec(header.reviewBy ?? '');
  return match ? match[1] : null;
}

function readFrontmatter(lines) {
  if (lines.length === 0 || lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === '---' || trimmed === '...') return { lines: lines.slice(1, i), end: i + 1 };
  }
  return null;
}

function readLeadingComments(lines, start) {
  const collected = [];
  let i = start;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      i += 1;
      continue;
    }
    if (!trimmed.startsWith('<!--')) break;
    while (i < lines.length) {
      collected.push(lines[i]);
      const closes = lines[i].includes('-->');
      i += 1;
      if (closes) break;
    }
  }
  return collected;
}

function unquote(value) {
  const match = /^(["'])(.*)\1$/.exec(value);
  return match ? match[2] : value;
}
