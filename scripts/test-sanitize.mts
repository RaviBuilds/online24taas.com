import { sanitizeHtml } from '../src/lib/sanitizeHtml.ts';
let f=0;
function check(n:string,c:boolean){const ok=!!c;if(!ok)f++;console.log((ok?'PASS':'FAIL')+' '+n);}
const clean=sanitizeHtml('<p>Hello <strong>world</strong></p><script>alert(1)</script><a href="javascript:alert(2)">x</a><img src="ok.jpg" onerror="alert(3)">');
check('script removed',!clean.includes('script'));
check('js url removed',!clean.includes('javascript:'));
check('event handler removed',!clean.includes('onerror'));
check('safe tags preserved',clean.includes('<p>')&&clean.includes('<strong>'));
check('img preserved',clean.includes('<img'));
const m=sanitizeHtml('<p>bad <iframe src="x"></iframe> text</p>');
check('iframe removed',!m.includes('iframe'));
const u=sanitizeHtml('a < b and c > d');
check('stray lt escaped',u.includes('&lt;')&&u.includes('&gt;'));
console.log('RESULT: '+(f===0?'ALL TESTS PASS':f+' FAILED'));
process.exit(f===0?0:1);
