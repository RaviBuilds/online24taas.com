import { sanityFetch } from '@/sanity/lib/client';
import { LATEST_COUNT, LATEST_QUERY } from '@/sanity/lib/queries';
import { pageRange, type PostCardData } from '@/lib/data';
import { Listing } from '@/components/Listing';
import { blogPath } from '@/lib/urls';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;
export const metadata = buildMetadata({ title: 'सर्व बातम्या', description: 'Online24Taas वरील सर्व मराठी बातम्या आणि लेख.', path: '/blog' });

export default async function BlogIndex() {
  const { from, to } = pageRange(1);
  const [posts, total] = await Promise.all([sanityFetch<PostCardData[]>(LATEST_QUERY, { from, to }, ['posts']), sanityFetch<number>(LATEST_COUNT, {}, ['posts'])]);
  return <Listing heading="सर्व बातम्या" crumbs={[{ name: 'बातम्या' }]} posts={posts} total={total} page={1} href={blogPath} />;
}
