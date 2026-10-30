import fs from 'node:fs';
import path from 'node:path';

const NORM = path.resolve(process.cwd(), 'migration/work/normalized');
const load = (n: string) => JSON.parse(fs.readFileSync(path.join(NORM, n + '.json'), 'utf8'));

export interface Rec { id: number; title: string; slug: string; content: string; imageLed?: boolean; featuredImageId?: number | null; categoryIds: number[]; tagIds: number[] }
export const posts: Rec[] = load('posts');
export const pages: Rec[] = load('pages');
export const drafts: Rec[] = load('drafts');
export const categories: { id: number; title: string; slug: string }[] = load('categories');
export const tags: { id: number; title: string; slug: string }[] = load('tags');
export const post = (id: number) => posts.find((p) => p.id === id)!;
export const enc = (slug: string) => encodeURIComponent(slug);
