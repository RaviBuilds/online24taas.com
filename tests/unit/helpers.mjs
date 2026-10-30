import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const NORM = path.join(ROOT, 'migration/work/normalized');
export const RAW = path.join(ROOT, 'migration/work/raw');
export const WP_SQL = process.env.WP_SQL || path.resolve(ROOT, '../online24taas/APP-DATA.SQL');
export const norm = (n) => JSON.parse(fs.readFileSync(path.join(NORM, n + '.json'), 'utf8'));
export const raw = (n) => JSON.parse(fs.readFileSync(path.join(RAW, n + '.json'), 'utf8'));
export const haveWork = fs.existsSync(path.join(NORM, 'reconciliation.json'));
export const haveSql = fs.existsSync(WP_SQL);
