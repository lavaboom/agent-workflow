import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contentHash, sameContent } from '../src/hash.mjs';

describe('contentHash', () => {
  it('gives the same hash for CRLF and LF content', () => {
    const lf = Buffer.from('line one\nline two\n', 'utf8');
    const crlf = Buffer.from('line one\r\nline two\r\n', 'utf8');
    assert.equal(contentHash(crlf), contentHash(lf));
    assert.ok(sameContent(crlf, lf));
  });

  it('is the sha256 of the LF bytes and still tells different text apart', () => {
    assert.equal(contentHash(Buffer.from('a\n')), '87428fc522803d31065e7bce3cf03fe475096631e5e07bbd7a0fde60c4cf25c7');
    assert.notEqual(contentHash(Buffer.from('a\n')), contentHash(Buffer.from('b\n')));
    assert.notEqual(contentHash(Buffer.from('a\r')), contentHash(Buffer.from('a\n')));
  });
});
