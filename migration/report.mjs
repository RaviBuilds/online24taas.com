#!/usr/bin/env node
// report.mjs — collate durable, reviewable artefacts into migration/reports/ (safe to commit: no
// credentials, no comment data, no draft titles).
//   node migration/report.mjs --project <id> --dataset <name>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNormalized } from './lib/context.mjs';
import { parseArgs, resolveTarget, readJson, stateDir } from './lib/target.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs();
const target = resolveTarget(args);
const out = path.join(HERE, 'reports', target.key);
fs.mkdirSync(out, { recursive: true });
const bundleDir = path.join(HERE, 'work/out', target.key);
const w = (n, v) => fs.writeFileSync(path.join(out, n), typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n');

const recon = loadNormalized('reconciliation');
w('reconciliation.json', recon);

const manifest = readJson(path.join(bundleDir, 'manifest.json'));
w('source-to-target-manifest.json', { target: manifest.target, generatedAt: manifest.generatedAt, counts: manifest.counts, documentsSha256: manifest.documentsSha256, missingAssets: manifest.missingAssets, entries: manifest.entries.map(({ source, kind, docId, slug, imageLed, draftBucket, assetId }) => ({ source, kind, docId, ...(slug ? { slug } : {}), ...(imageLed ? { imageLed } : {}), ...(draftBucket ? { draftBucket } : {}), ...(assetId ? { assetId } : {}) })), excluded: manifest.excluded });

const tr = readJson(path.join(bundleDir, 'transform-report.json'));
w('transform-report.json', { totals: tr.totals, rawHtml: tr.rawHtml, droppedAttributes: tr.droppedAttributes, alignedBlocks: tr.alignedBlocks, unresolved: tr.perDoc });

const verify = readJson(path.join(stateDir(target), 'verify.json'));
if (verify) w('verify.json', verify);

w('orphan-media.json', loadNormalized('orphan-media'));
w('revisions.json', loadNormalized('revisions'));
w('drafts-classification.json', loadNormalized('drafts').map((d) => ({ id: d.id, status: d.status, bucket: d.bucket, importAs: d.importAs, bodyChars: d.content.length, hasFeaturedImage: !!d.featuredImageId })));

// Legacy URL map (WordPress ?p=ID -> new route). Used for audits; runtime redirects resolve live in Sanity.
const rows = ['wp_url,new_path,type'];
for (const p of loadNormalized('posts')) rows.push(`https://www.online24taas.com/?p=${p.id},/blog/${encodeURIComponent(p.slug)},post`);
for (const p of loadNormalized('pages')) rows.push(`https://www.online24taas.com/?page_id=${p.id},/${encodeURIComponent(p.slug)},page`);
for (const c of loadNormalized('categories')) rows.push(`https://www.online24taas.com/?cat=${c.id},/category/${encodeURIComponent(c.slug)},category`);
w('legacy-redirect-map.csv', rows.join('\n') + '\n');
console.log('reports written to', path.relative(process.cwd(), out));
