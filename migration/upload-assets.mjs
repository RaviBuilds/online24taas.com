#!/usr/bin/env node
// upload-assets.mjs — upload original WordPress media to the Sanity asset pipeline.
//
//   node migration/upload-assets.mjs --project <id> --dataset <name> --use-cli-auth \
//        [--ids 1,2,3 | --only-used] [--limit N] [--concurrency 4] [--dry-run] [--wp-root <dir>]
//
// * Uploads the file named by `_wp_attached_file` (the original / "-scaled" upload), never the
//   generated thumbnail variants (-150x150, -300x200, ...); Sanity serves any size on demand.
// * Resumable + idempotent: state/assets.json maps wpAttachmentId -> Sanity asset _id. Sanity also
//   dedupes by SHA-1, so re-uploading identical bytes returns the existing asset.
// * Stores the WordPress attachment id on the asset itself (`source.id`).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNormalized } from './lib/context.mjs';
import { makeClient, parseArgs, stateDir, readJson, writeJson, withRetry, resolveTarget } from './lib/target.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs();
const WP_ROOT = args['wp-root'] || path.resolve(HERE, '../../online24taas');
const UPLOADS = path.join(WP_ROOT, 'wp-content/uploads');
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);
const dry = !!args['dry-run'];

const target = resolveTarget(args);
const dir = stateDir(target);
const mapPath = path.join(dir, 'assets.json');
const logPath = path.join(dir, 'assets.errors.ndjson');
const map = readJson(mapPath, {});

let attachments = loadNormalized('attachments');
if (args.ids) {
  const want = new Set(String(args.ids).split(',').map(Number));
  attachments = attachments.filter((a) => want.has(a.id));
}
if (args['only-used']) {
  const used = new Set();
  for (const f of ['posts', 'pages', 'drafts']) for (const r of loadNormalized(f)) {
    if (r.featuredImageId) used.add(r.featuredImageId);
    for (const m of r.content.matchAll(/wp-image-(\d+)/g)) used.add(Number(m[1]));
  }
  attachments = attachments.filter((a) => used.has(a.id));
}
const todo = attachments.filter((a) => !map[a.id]);
const limited = args.limit ? todo.slice(0, Number(args.limit)) : todo;
console.log(`target=${target.key} attachments=${attachments.length} alreadyUploaded=${attachments.length - todo.length} toUpload=${limited.length}${dry ? ' (dry-run)' : ''}`);

if (dry) {
  let bytes = 0;
  for (const a of limited) bytes += fs.statSync(path.join(UPLOADS, a.relPath)).size;
  console.log(`dry-run: would upload ${limited.length} files, ${(bytes / 1048576).toFixed(1)} MiB`);
  process.exit(0);
}

const { client } = makeClient(args);
const concurrency = Number(args.concurrency || 4);
let done = 0, failed = 0;
const t0 = Date.now();

async function uploadOne(a) {
  const file = path.join(UPLOADS, a.relPath);
  if (!fs.existsSync(file)) throw new Error('local file missing: ' + a.relPath);
  const kind = IMAGE_MIME.has(a.mimeType) ? 'image' : 'file';
  const doc = await withRetry(
    () =>
      client.assets.upload(kind, fs.createReadStream(file), {
        filename: path.basename(a.relPath),
        title: a.title || undefined,
        description: a.alt || a.caption || undefined,
        source: { name: 'wordpress', id: String(a.id), url: a.legacyUrl },
      }),
    { label: `upload ${a.id}`, onRetry: (n, e) => console.warn(`  retry ${n} for ${a.id}: ${e.message}`) }
  );
  map[a.id] = { assetId: doc._id, type: kind, sha1: doc.sha1hash, bytes: doc.size, mimeType: doc.mimeType, width: doc.metadata?.dimensions?.width ?? null, height: doc.metadata?.dimensions?.height ?? null };
}

const queue = [...limited];
async function worker() {
  while (queue.length) {
    const a = queue.shift();
    try {
      await uploadOne(a);
      done++;
    } catch (e) {
      failed++;
      fs.appendFileSync(logPath, JSON.stringify({ id: a.id, path: a.relPath, error: String(e.message || e), at: new Date().toISOString() }) + '\n');
    }
    if ((done + failed) % 10 === 0) {
      writeJson(mapPath, map);
      console.log(`  progress ${done + failed}/${limited.length} ok=${done} failed=${failed} elapsed=${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
writeJson(mapPath, map);
console.log(`finished: uploaded=${done} failed=${failed} totalMapped=${Object.keys(map).length}`);
process.exit(failed ? 1 : 0);
