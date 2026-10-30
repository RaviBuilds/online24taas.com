// Minimal PHP unserialize(): enough for WordPress attachment metadata, theme mods and option arrays.
// String lengths in PHP serialization are BYTE counts, so we operate on a UTF-8 Buffer.
export function phpUnserialize(input) {
  const buf = Buffer.from(input, 'utf8');
  let i = 0;
  const readUntil = (ch) => {
    const start = i;
    while (buf[i] !== ch.charCodeAt(0)) {
      if (i >= buf.length) throw new Error('phpUnserialize: unexpected end');
      i++;
    }
    const s = buf.toString('utf8', start, i);
    i++; // consume delimiter
    return s;
  };
  const expect = (ch) => {
    if (buf[i] !== ch.charCodeAt(0)) throw new Error(`phpUnserialize: expected ${ch} at ${i}`);
    i++;
  };
  function parse() {
    const t = String.fromCharCode(buf[i]);
    i++;
    switch (t) {
      case 'N': expect(';'); return null;
      case 'b': { expect(':'); const v = readUntil(';'); return v === '1'; }
      case 'i': { expect(':'); return parseInt(readUntil(';'), 10); }
      case 'd': { expect(':'); return parseFloat(readUntil(';')); }
      case 's': {
        expect(':');
        const len = parseInt(readUntil(':'), 10);
        expect('"');
        const s = buf.toString('utf8', i, i + len);
        i += len;
        expect('"');
        expect(';');
        return s;
      }
      case 'a': {
        expect(':');
        const n = parseInt(readUntil(':'), 10);
        expect('{');
        const out = {};
        for (let k = 0; k < n; k++) {
          const key = parse();
          out[key] = parse();
        }
        expect('}');
        return out;
      }
      case 'O': {
        expect(':');
        readUntil(':'); // class name length
        const cls = readUntil(':').replace(/"/g, '');
        const n = parseInt(readUntil(':'), 10);
        expect('{');
        const out = { __class: cls };
        for (let k = 0; k < n; k++) {
          const key = parse();
          out[key] = parse();
        }
        expect('}');
        return out;
      }
      default:
        throw new Error(`phpUnserialize: unsupported type ${t} at ${i - 1}`);
    }
  }
  return parse();
}
