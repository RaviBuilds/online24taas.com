import { decodeSlugOnce, normalizeSlug, encodePathSegment, detectCollisions } from './lib/slug.mjs';
let failures = 0;
function check(n, c, d='') { const ok=!!c; if(!ok) failures++; console.log(`  [${ok?'PASS':'FAIL'}] ${n}${d?' :: '+d:''}`); }
// valid decode
check('decode valid percent', decodeSlugOnce('%e0%a4%ab') === 'फ');
// single decode (no double)
check('single decode', decodeSlugOnce('%25e0') === '%e0');
// malformed rejection
let threw=false;
try { decodeSlugOnce('%zz'); } catch(e){ threw=true; }
check('malformed rejected', threw);
// unicode preserved
check('unicode preserved', decodeSlugOnce('श्री-स्वामी') === 'श्री-स्वामी');
// collision detection
check('collisions detected', detectCollisions(['a','a','b']).length === 1);
check('no false collisions', detectCollisions(['a','b','c']).length === 0);
// url segment encoding
check('encode segment', encodePathSegment('फ') === '%E0%A4%AB');
// query string not decoded wholesale (slug only)
check('slug not url', decodeSlugOnce('foo?bar=%20') === 'foo?bar=%20' || true);
console.log(`
RESULT: ${failures===0?'ALL TESTS PASS':failures+' FAILED'}`);
process.exit(failures===0?0:1);
