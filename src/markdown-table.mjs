// Markdown tables in prose documents: find one under a heading, split rows into cells, rebuild a row.
// Tolerates CRLF (callers split lines with text.mjs), escaped pipes and code spans in cells.

const HEADING = /^#{1,6}\s/;
const ALIGNMENT_CELL = /^:?-+:?$/;

export function isHeading(line) {
  return HEADING.test(line.trim());
}

function isTableLine(line) {
  return line.trim().startsWith('|');
}

// Cells of one table row, trimmed. An escaped pipe (\|) stays inside its cell, as written.
export function splitRow(line) {
  let body = line.trim();
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1);
  const cells = [];
  let current = '';
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '\\' && body[i + 1] === '|') {
      current += '\\|';
      i += 1;
    } else if (body[i] === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += body[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

export function isAlignmentRow(cells) {
  return cells.length > 0 && cells.every((cell) => ALIGNMENT_CELL.test(cell.replace(/\s/g, '')));
}

// Every table in lines: { header: string[], headerLine, firstRow, end } with 0-based line indexes
// (rows are firstRow..end-1). Tables inside fenced code blocks and HTML comments are not tables.
export function findTables(lines) {
  const tables = [];
  let fence = null;
  let inComment = false;
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (inComment) {
      inComment = !trimmed.includes('-->');
      continue;
    }
    if (fence !== null) {
      if (trimmed.startsWith(fence)) fence = null;
      continue;
    }
    const fenceMatch = /^(```+|~~~+)/.exec(trimmed);
    if (fenceMatch) {
      fence = fenceMatch[1];
      continue;
    }
    if (trimmed.startsWith('<!--')) {
      inComment = !trimmed.includes('-->');
      continue;
    }
    if (!isTableLine(lines[i]) || i + 1 >= lines.length || !isTableLine(lines[i + 1])) continue;
    if (!isAlignmentRow(splitRow(lines[i + 1]))) continue;
    let end = i + 2;
    while (end < lines.length && isTableLine(lines[end])) end += 1;
    tables.push({ header: splitRow(lines[i]), headerLine: i, firstRow: i + 2, end });
    i = end - 1;
  }
  return tables;
}

// The first table after the first heading whose text matches headingPattern, before the next heading.
export function findTableUnderHeading(lines, headingPattern) {
  const tables = findTables(lines);
  for (let h = 0; h < lines.length; h += 1) {
    if (!isHeading(lines[h]) || !headingPattern.test(lines[h])) continue;
    const nextHeading = lines.findIndex((line, index) => index > h && isHeading(line) && !insideTable(tables, index));
    const limit = nextHeading < 0 ? lines.length : nextHeading;
    const table = tables.find((candidate) => candidate.headerLine > h && candidate.headerLine < limit);
    if (table) return table;
  }
  return null;
}

function insideTable(tables, index) {
  return tables.some((table) => index >= table.headerLine && index < table.end);
}

// The cells of a two-column table row: the name and the value (extra cells belong to the value,
// joined back with the pipe that separated them).
export function nameAndValue(cells, columnCount) {
  const name = cells[0] ?? '';
  if (columnCount > 2) return { name, value: cells[1] ?? '' };
  return { name, value: cells.slice(1).join(' | ') };
}

export function buildRow(cells) {
  return `| ${cells.join(' | ')} |`;
}
