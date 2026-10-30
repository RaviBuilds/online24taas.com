#!/usr/bin/env node
// import.mjs — resumable, idempotent writer for a built NDJSON bundle.
//
//   node migration/import.mjs --project <id> --dataset <name> --use-cli-auth \
//        [--subset] [--dry-run] [--limit N] [--batch-size 25] [--resume] [--adopt-matching] [--force-update]
//
// Safety model (nothing is ever deleted; only deterministic WordPress-derived _ids are written):
//   * remote missing                         -> create
//   * remote identical to desired            -> unchanged (no write)
//   * remote == what we wrote last time      -> update (the document was not edited since import)
//   * remote differs and was edited by hand  -> CONFLICT: skipped and reported, never overwritten
//     (override only with --force-update)
//   * remote exists without import history   -> CONFLICT unless --adopt-matching and the document has
//     the same _type and the same wp* provenance id (e.g. the 104 taxonomy docs seeded earlier)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeClient, parseArgs, stateDir, readJson, writeJson, withRetry } from './lib/target.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs();
const { client, target } = makeClient(args, { needWrite: true });
const dry = !!args['dry-run'];
const batchSize = Number(args['batch-size'] || 25);
const MAX_TX_BYTES = 1_500_000;
const dir = path.join(HERE, 'work/out', target.key + (args.subset ? '-subset' : ''));
const sdir = stateDir(target);
const statePath = path.join(sdir, args.subset ? 'import-subset.json' : 'import.json');
const logPath = path.join(sdir, 'import.log.ndjson');
const state = readJson(statePath, { docs: {}, runs: [] });

let docs = fs.readFileSync(path.join(dir, 'documents.ndjson'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
if (args.limit) docs = docs.slice(0, Number(args.limit));

const canonical = (v) => {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
  return v;
};
const strip = ({ _rev, _createdAt, _updatedAt, ...rest }) => rest;
const hashOf = (doc) => crypto.createHash('sha1').update(JSON.stringify(canonical(strip(doc)))).digest('hex');
const PROV = ['wpPostId', 'wpTermId', 'wpUserId', 'wpAttachmentId'];
const provenanceMatches = (remote, desired) =>
  (remote._type === desired._type && PROV.some((k) => desired[k] !== undefined && remote[k] === desired[k])) ||
  (desired._type === 'siteSettings' && remote._type === 'siteSettings');
const log = (o) => fs.appendFileSync(logPath, JSON.stringify({ at: new Date().toISOString(), ...o }) + '\n');

const run = { startedAt: new Date().toISOString(), dry, total: docs.length, created: 0, updated: 0, unchanged: 0, conflicts: [], failed: [], retries: 0 };
console.log(`target=${target.key} bundle=${path.relative(process.cwd(), dir)} docs=${docs.length} batch=${batchSize}${dry ? ' (DRY-RUN: no writes)' : ''}`);

function plan(desired, remote) {
  const dh = hashOf(desired);
  if (!remote) return { action: 'create', hash: dh };
  const rh = hashOf(remote);
  if (rh === dh) return { action: 'unchanged', hash: dh };
  if (args['force-update']) return { action: 'update', hash: dh };
  if (state.docs[desired._id]?.hash === rh) return { action: 'update', hash: dh };
  if (!state.docs[desired._id] && args['adopt-matching'] && provenanceMatches(remote, desired)) return { action: 'update', hash: dh };
  return { action: 'conflict', hash: dh, reason: state.docs[desired._id] ? 'remote edited since import' : 'remote exists without import history' };
}

const bump = (it) => {
  run[it.action === 'create' ? 'created' : 'updated']++;
  state.docs[it.doc._id] = { hash: it.hash, writtenAt: new Date().toISOString() };
};
const addToTx = (t, it) => (it.action === 'create' ? t.create(it.doc) : t.createOrReplace(it.doc));

async function flush(items) {
  if (!items.length) return;
  const t = client.transaction();
  items.forEach((it) => addToTx(t, it));
  try {
    await withRetry(() => t.commit({ visibility: 'sync' }), { onRetry: (n, e) => { run.retries++; console.warn(`  retry ${n}: ${e.message}`); } });
    items.forEach(bump);
  } catch (e) {
    console.warn(`  batch failed (${String(e.message).slice(0, 160)}); retrying document-by-document`);
    for (const it of items) {
      try {
        const one = client.transaction();
        addToTx(one, it);
        await withRetry(() => one.commit({ visibility: 'sync' }), { onRetry: () => run.retries++ });
        bump(it);
      } catch (e2) {
        run.failed.push({ id: it.doc._id, error: String(e2.message).slice(0, 300) });
        log({ level: 'error', id: it.doc._id, error: String(e2.message).slice(0, 500) });
      }
    }
  }
}

for (let i = 0; i < docs.length; i += batchSize) {
  const slice = docs.slice(i, i + batchSize);
  const allKnown = args.resume && slice.every((d) => state.docs[d._id]?.hash === hashOf(d));
  const remoteDocs = allKnown ? null : await withRetry(() => client.getDocuments(slice.map((d) => d._id)));
  const remoteById = new Map((remoteDocs || []).filter(Boolean).map((d) => [d._id, d]));
  let pending = [];
  let bytes = 0;
  for (const desired of slice) {
    const p = allKnown ? { action: 'unchanged', hash: hashOf(desired) } : plan(desired, remoteById.get(desired._id));
    if (p.action === 'unchanged') {
      run.unchanged++;
      state.docs[desired._id] = { hash: p.hash, writtenAt: state.docs[desired._id]?.writtenAt ?? new Date().toISOString() };
    } else if (p.action === 'conflict') {
      run.conflicts.push({ id: desired._id, reason: p.reason });
    } else if (dry) {
      run[p.action === 'create' ? 'created' : 'updated']++;
    } else {
      const size = JSON.stringify(desired).length;
      if (bytes + size > MAX_TX_BYTES && pending.length) {
        await flush(pending);
        pending = [];
        bytes = 0;
      }
      pending.push({ ...p, doc: desired });
      bytes += size;
    }
  }
  if (!dry) {
    await flush(pending);
    writeJson(statePath, state);
  }
  console.log(`  ${Math.min(i + batchSize, docs.length)}/${docs.length} created=${run.created} updated=${run.updated} unchanged=${run.unchanged} conflicts=${run.conflicts.length} failed=${run.failed.length}`);
}

run.finishedAt = new Date().toISOString();
state.runs.push({ ...run, conflicts: run.conflicts.length, failed: run.failed.length });
if (!dry) writeJson(statePath, state);
writeJson(path.join(sdir, args.subset ? 'last-import-subset-run.json' : 'last-import-run.json'), run);
console.log(`done: created=${run.created} updated=${run.updated} unchanged=${run.unchanged} conflicts=${run.conflicts.length} failed=${run.failed.length} retries=${run.retries}`);
if (run.conflicts.length) console.log('conflicts (not overwritten):', run.conflicts.slice(0, 10));
if (run.failed.length) console.log('failed:', run.failed.slice(0, 10));
process.exit(run.failed.length ? 1 : 0);
