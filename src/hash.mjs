// Content hash used by the manifest. CRLF is normalised to LF before hashing so that a checkout with
// Windows line endings and one with Unix line endings of the same text hash the same; the bytes on disk
// are never changed by this.
import { createHash } from 'node:crypto';

export function contentHash(bytes) {
  return createHash('sha256').update(normaliseLineEndings(bytes)).digest('hex');
}

export function sameContent(a, b) {
  return contentHash(a) === contentHash(b);
}

function normaliseLineEndings(bytes) {
  if (!bytes.includes(0x0d)) return bytes;
  const out = Buffer.alloc(bytes.length);
  let length = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0x0d && bytes[i + 1] === 0x0a) continue;
    out[length] = bytes[i];
    length += 1;
  }
  return out.subarray(0, length);
}
