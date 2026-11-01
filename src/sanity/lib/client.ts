import 'server-only';
import { createClient, type QueryParams } from 'next-sanity';
import { apiVersion, dataset, projectId } from '../env';

// Published content only. `perspective: 'published'` guarantees drafts are never returned, even when a
// read token (needed for private datasets) is configured. The token never reaches the browser:
// this module is server-only and the variable has no NEXT_PUBLIC_ prefix.
const token = process.env.SANITY_API_READ_TOKEN || undefined;

export const publishedClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  // Direct API, not the CDN: Next's data cache already absorbs the traffic, and with webhook revalidation the CDN could
  // still serve the previous version for a moment after the webhook fires.
  useCdn: false,
  perspective: 'published',
});

const REVALIDATE_SECONDS = 300;

export async function sanityFetch<T>(query: string, params: QueryParams = {}, tags: string[] = ['sanity']): Promise<T> {
  return publishedClient.fetch<T>(query, params, { next: { revalidate: REVALIDATE_SECONDS, tags } });
}
