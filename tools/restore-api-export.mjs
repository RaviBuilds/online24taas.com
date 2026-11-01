// Replay the application documents of an API-export NDJSON into a dataset with createOrReplace.
// Recovery step 2 after `sanity dataset import <tarball>` (which restores assets and most documents but drops
// asset references on some draft documents). System and asset documents in the export are skipped.
//   node tools/restore-api-export.mjs <export.ndjson> --project P --dataset D --use-cli-auth [--confirm-production]
import fs from 'node:fs';
import { parseArgs, makeClient } from '../migration/lib/target.mjs';

const args = parseArgs();
const file = args._[0];
if (!file) throw new Error('usage: restore-api-export.mjs <export.ndjson> --project P --dataset D --use-cli-auth');
const { client, target } = makeClient(args);
if (target.dataset === 'production' && !args['confirm-production']) {
  throw new Error('Refusing to write to a dataset named "production" without --confirm-production.');
}
const docs = fs
  .readFileSync(file, 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((d) => !d._type.startsWith('system.') && !d._type.startsWith('sanity.'));
for (let i = 0; i < docs.length; i += 50) {
  const tx = client.transaction();
  for (const d of docs.slice(i, i + 50)) tx.createOrReplace(d);
  await tx.commit({ visibility: 'async' });
}
console.log(`replayed ${docs.length} documents into ${target.key}`);
