// Resolve the Sanity target (project + dataset + token) for migration scripts.
//
//   --project <id> --dataset <name>      (required; there is intentionally NO default so a script can
//                                         never write to a dataset by accident)
//   token: SANITY_API_WRITE_TOKEN env var, else --use-cli-auth (the logged-in `sanity login` session).
// The token is never printed or written to disk by this code.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createClient } from '@sanity/client';

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

export function resolveToken(args) {
  if (process.env.SANITY_API_WRITE_TOKEN) return process.env.SANITY_API_WRITE_TOKEN;
  if (args['use-cli-auth']) {
    const cfg = path.join(os.homedir(), '.config', 'sanity', 'config.json');
    try {
      return JSON.parse(fs.readFileSync(cfg, 'utf8')).authToken;
    } catch {
      throw new Error('--use-cli-auth given but no Sanity CLI login found (run `npx sanity login`).');
    }
  }
  return undefined;
}

export function resolveTarget(args) {
  const projectId = args.project || process.env.SANITY_TARGET_PROJECT;
  const dataset = args.dataset || process.env.SANITY_TARGET_DATASET;
  if (!projectId || !dataset) throw new Error('Specify --project <id> and --dataset <name> (no default, by design).');
  return { projectId, dataset, key: `${projectId}.${dataset}` };
}

export function makeClient(args, { needWrite = true } = {}) {
  const target = resolveTarget(args);
  const token = resolveToken(args);
  if (needWrite && !token) throw new Error('No write credentials: set SANITY_API_WRITE_TOKEN or pass --use-cli-auth.');
  const client = createClient({ projectId: target.projectId, dataset: target.dataset, apiVersion: '2025-02-19', token, useCdn: false, perspective: 'raw' });
  return { client, target };
}

export const STATE_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../work/state');
export function stateDir(target) {
  const d = path.join(STATE_ROOT, target.key);
  fs.mkdirSync(d, { recursive: true });
  return d;
}
export const readJson = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);
export const writeJson = (p, v) => {
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(v, null, 2));
  fs.renameSync(tmp, p);
};
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function withRetry(fn, { retries = 4, label = 'op', onRetry } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      const status = e?.statusCode || e?.response?.statusCode;
      const retriable = !status || status === 429 || status >= 500;
      if (!retriable || attempt > retries) throw e;
      onRetry?.(attempt, e);
      await sleep(Math.min(30000, 1000 * 2 ** attempt));
    }
  }
}
