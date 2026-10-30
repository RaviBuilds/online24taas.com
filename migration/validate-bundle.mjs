#!/usr/bin/env node
// validate-bundle.mjs — local validation of an NDJSON bundle before any remote write.
//   node migration/validate-bundle.mjs --project <id> --dataset <name> [--subset] [--allow-missing-assets]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, resolveTarget, stateDir, readJson } from './lib/target.mjs';
import { validateDocuments } from './lib/validate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs();
const target = resolveTarget(args);
const dir = args.dir || path.join(HERE, 'work/out', target.key + (args.subset ? '-subset' : ''));
const docs = fs.readFileSync(path.join(dir, 'documents.ndjson'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const assetMap = readJson(path.join(stateDir(target), 'assets.json'), {});
const known = new Set(Object.values(assetMap).map((a) => a.assetId));
const errors = validateDocuments(docs, { knownRefTargets: known, requireAssets: !args['allow-missing-assets'] });
console.log(`validated ${docs.length} documents in ${path.relative(process.cwd(), dir)}: ${errors.length} error(s)`);
errors.slice(0, 50).forEach((e) => console.log('  ✗', e));
process.exit(errors.length ? 1 : 0);
