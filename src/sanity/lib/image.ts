import imageUrlBuilder from '@sanity/image-url';
import { dataset, projectId } from '../env';

const builder = imageUrlBuilder({ projectId, dataset });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const urlFor = (source: any) => builder.image(source);

export interface ImageRef {
  ref: string;
  alt?: string | null;
  caption?: string | null;
}

/** `image-<sha1>-<w>x<h>-<ext>` -> intrinsic size + canonical CDN URL (no joins needed in GROQ). */
export function parseImageRef(ref: string): { width: number; height: number; url: string } | null {
  const m = /^image-([a-f0-9]+)-(\d+)x(\d+)-([a-z0-9]+)$/i.exec(ref);
  if (!m) return null;
  const [, id, w, h, ext] = m;
  return { width: Number(w), height: Number(h), url: `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${w}x${h}.${ext}` };
}

export { default as sanityLoader } from './imageLoader';
