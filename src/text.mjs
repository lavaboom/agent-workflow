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

// The line ending a text uses: CRLF when it has any, else LF (also for a text without line breaks).
export function lineEnding(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

// Lines joined back with the given ending, with a final line ending.
export function joinLines(lines, eol) {
  return lines.length === 0 ? '' : `${lines.join(eol)}${eol}`;
}

// The text of bytes that are valid UTF-8, else null (a rewrite through a string would change them).
export function decodeUtf8(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return null;
  }
}
