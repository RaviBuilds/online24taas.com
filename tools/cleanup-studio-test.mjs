// Removes anything e2e/studio-ui.spec.ts created if a run was killed before its own cleanup ran.
// Matches ONLY: post/category/tag documents titled "चाचणी …" without a WordPress ID, and unreferenced images named
// featured.png / inline.png. Dry run by default; add --delete to apply.
//   node tools/cleanup-studio-test.mjs --use-cli-auth [--delete]
import { parseArgs, makeClient } from '../migration/lib/target.mjs';

const args = parseArgs();
const { client } = makeClient({ ...args, project: 'mkiaioc7', dataset: 'production' });
const raw = { perspective: 'raw' };
const docs = await client.fetch('*[_type in ["post","category","tag"] && title match "चाचणी*" && wpPostId == null && wpTermId == null]{_id,_type,title}', {}, raw);
const assets = await client.fetch('*[_type=="sanity.imageAsset" && originalFilename in ["featured.png","inline.png"] && count(*[references(^._id)]) == 0]{_id}', {}, raw);
// The test edits the migrated article post-929 and discards the draft. If a run died first, remove that draft, but only
// when it is exactly the published title plus the test's marker (so a genuine editor draft is never deleted).
const pub = await client.getDocument('post-929');
const draft = await client.getDocument('drafts.post-929');
if (draft && pub && draft.title.startsWith(pub.title) && /^(\s*✎)+$/.test(draft.title.slice(pub.title.length))) docs.push({ _id: 'drafts.post-929', _type: 'post', title: draft.title });
console.log('documents:', docs.map((d) => `${d._id} ${d._type} ${d.title}`), '\nassets:', assets.map((a) => a._id));
if (args.delete) {
  const tx = client.transaction();
  for (const d of docs) tx.delete(d._id);
  await tx.commit();
  for (const a of assets) await client.delete(a._id);
  console.log('deleted');
} else console.log('dry run (use --delete)');
