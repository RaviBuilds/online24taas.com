// Read-only inventory of a live dataset, split into application documents and Sanity-managed documents.
//   node migration/inventory-live.mjs --project P --dataset D [--use-cli-auth] [--write]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, makeClient } from './lib/target.mjs';

const args = parseArgs();
const { client, target } = makeClient(args, { needWrite: false });
const docs = await client.fetch('*{_id,_type}', {}, { perspective: 'raw' });
const isDraft = (d) => d._id.startsWith('drafts.');
const sanityManaged = (d) => d._type.startsWith('system.') || d._type.startsWith('sanity.');
const count = (list) => list.reduce((m, d) => ((m[d._type] = (m[d._type] || 0) + 1), m), {});
const app = docs.filter((d) => !sanityManaged(d));
const inv = {
  project: target.projectId,
  dataset: target.dataset,
  generatedAt: new Date().toISOString(),
  totalDocuments: docs.length,
  applicationDocuments: app.length,
  applicationByType: count(app),
  applicationDraftsByType: count(app.filter(isDraft)),
  applicationPublishedByType: count(app.filter((d) => !isDraft(d))),
  sanityManagedByType: count(docs.filter(sanityManaged)),
};
console.log(JSON.stringify(inv, null, 2));
if (args.write) {
  const out = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'reports', target.key, 'live-inventory.json');
  fs.writeFileSync(out, JSON.stringify(inv, null, 2) + '\n');
  console.log('written', out);
}
