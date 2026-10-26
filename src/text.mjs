// Line handling shared by every parser: tolerates a UTF-8 BOM and CRLF line endings.

export function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Splits text into lines without their terminators. A final newline does not add an empty line.
export function splitLines(text) {
  const lines = stripBom(text).split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function countLines(text) {
  return splitLines(text).length;
}
