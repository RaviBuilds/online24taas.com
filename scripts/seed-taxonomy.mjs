// seed-taxonomy.mjs — idempotent seed of author + categories + tags into Sanity.
//
// Safety properties:
//  - Deterministic _ids (author-<uid>, category-<tid>, tag-<tid>) + createOrReplace => rerun-safe,
//    no duplicate documents.
//  - NEVER publishes posts/pages; NEVER deletes existing documents.
//  - Reads projectId/dataset from env; token read from SANITY_API_WRITE_TOKEN (never hardcoded,
//    never printed). If token is missing, runs in --dry-run and only prints the payload summary.
//
// Usage:
//   node scripts/seed-taxonomy.mjs --dry-run          # validate payload, no network
//   SANITY_API_WRITE_TOKEN=... node scripts/seed-taxonomy.mjs   # actually seed
import fs from 'node:fs';
import path from 'node:path';

const NORM = '/tmp/online24taas-work/migration/normalized';
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || 'mkiaioc7';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || 'production';
const token = process.env.SANITY_API_WRITE_TOKEN;
const dryRun = process.argv.includes('--dry-run') || !token;

function buildDocs() {
  const users = JSON.parse(fs.readFileSync(path.join(NORM, 'users.json'), 'utf8'));
  const terms = JSON.parse(fs.readFileSync(path.join(NORM, 'terms.json'), 'utf8'));
  const docs = [];
  for (const u of users) {
    docs.push({ _id: u._id, _type: 'author', name: u.name, slug: { _type: 'slug', current: u.slug }, wpUserId: u.wpUserId });
  }
  for (const t of terms) {
    const type = t.taxonomy === 'category' ? 'category' : 'tag';
    docs.push({ _id: t._id, _type: type, title: t.title, slug: { _type: 'slug', current: t.slug }, wpTermId: t.wpTermId });
  }
  return docs;
}

const docs = buildDocs();
const authors = docs.filter((d) => d._type === 'author');
const categories = docs.filter((d) => d._type === 'category');
const tags = docs.filter((d) => d._type === 'tag');

console.log('=== SEED PLAN ===');
console.log(`projectId=${projectId} dataset=${dataset} mode=${dryRun ? 'DRY-RUN (no writes)' : 'LIVE'}`);
console.log(`authors=${authors.length} categories=${categories.length} tags=${tags.length} total=${docs.length}`);
// Duplicate-id guard: deterministic ids must be unique or reruns would collide.
const ids = docs.map((d) => d._id);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
console.log(`duplicate _ids in payload: ${dup.length} ${dup.length ? ':: ' + dup.slice(0, 5).join(',') : '(ok)'}`);
console.log('sample docs:');
for (const d of [authors[0], categories[0], tags[0]].filter(Boolean)) {
  console.log('  ', JSON.stringify(d).slice(0, 120));
}

if (dryRun) {
  console.log('\nDRY-RUN complete. Set SANITY_API_WRITE_TOKEN and re-run (without --dry-run) to seed.');
  if (!token) console.log('(token not present in env — that is why this is a dry-run)');
  process.exit(dup.length === 0 ? 0 : 1);
}

// LIVE seed (requires @sanity/client installed). Dynamic import so dry-run needs no deps.
const { createClient } = await import('@sanity/client');
const client = createClient({ projectId, dataset, token, apiVersion: '2026-10-14', useCdn: false });

let tx = client.transaction();
for (const d of docs) tx = tx.createIfNotExist({ _id: d._id, _type: d._type });
tx = tx.patch(Object.fromEntries([])); // no-op guard
for (const d of docs) {
  const { _id, _type, ...rest } = d;
  tx = tx.patch(_id, (p) => p.set(rest));
}
console.log('\nCommitting transaction (createIfNotExist + set)...');
const res = await tx.commit({ dryRun: false });
console.log('Transaction committed. results:', res.results.length, 'docs');
console.log('NOTE: only author/category/tag were seeded. No posts/pages published.');
