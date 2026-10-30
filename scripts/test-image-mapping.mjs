import fs from 'node:fs';
import { transform } from './transform-pt.mjs';
const posts=JSON.parse(fs.readFileSync('/tmp/online24taas-work/migration/intermediate/wp_posts.json','utf8'));
const atts=new Set(posts.filter(p=>p.post_type==='attachment').map(p=>p.ID));
let f=0;
function check(n,c,d=''){const ok=!!c;if(!ok)f++;console.log((ok?'PASS':'FAIL')+' '+n+(d?' :: '+d:''));}
const pub=posts.filter(p=>p.post_status==='publish'&&p.post_type==='post');
check('featured images resolve', pub.every(p=>p.featuredImageId==null||atts.has(p.featuredImageId)), 'bad='+pub.filter(p=>p.featuredImageId!=null&&!atts.has(p.featuredImageId)).length);
check('featured image paths present', pub.filter(p=>p.featuredImageId!=null).every(p=>typeof p.featuredImagePath==='string'&&p.featuredImagePath.length>0));
let inline=0, badInline=0, emptyInline=0;
for(const p of pub){const r=transform(p.post_content||'');for(const b of r.blocks){if(b._type==='image'){inline++;if(b.wpAttachmentId!=null&&!atts.has(b.wpAttachmentId))badInline++;if(!b.src&&b.wpAttachmentId==null)emptyInline++;}}}
check('inline image ids resolve', badInline===0, 'inline='+inline+' bad='+badInline+' empty='+emptyInline);
console.log('RESULT: '+(f===0?'ALL TESTS PASS':f+' FAILED'));
process.exit(f===0?0:1);
