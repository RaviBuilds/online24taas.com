import { createHash } from 'node:crypto';

/**
 * Per-document cache tag. Next.js sends cache tags to the CDN in the `x-next-cache-tags` HTTP header, and HTTP header
 * values must be ASCII. Article and page slugs are Marathi, so the slug is hashed. The pages and the revalidate
 * webhook must derive the tag with this one function. (Raw `post:<Marathi slug>` tags made every Marathi article
 * answer HTTP 500 on Vercel; a local `next start` does not send the header and hid the problem.)
 */
export const slugTag = (kind: 'post' | 'page', slug: string) => `${kind}:${createHash('sha1').update(slug.normalize('NFC')).digest('hex').slice(0, 24)}`;
