import { defineType, defineField, defineArrayMember } from 'sanity';

// SEO metadata object (embedded on post & page).
// Source Yoast data was almost entirely auto-generated (0 custom titles/descriptions in the dump),
// so these fields are mostly optional and Next.js generateMetadata falls back to title/excerpt.
export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: { columns: 2 },
  fields: [
    defineField({ name: 'seoTitle', title: 'SEO Title', type: 'string' }),
    defineField({ name: 'metaDescription', title: 'Meta Description', type: 'text', rows: 3 }),
    defineField({ name: 'canonicalUrl', title: 'Canonical URL', type: 'url' }),
    defineField({ name: 'focusKeyword', title: 'Focus Keyword', type: 'string' }),
    defineField({ name: 'noIndex', title: 'No Index', type: 'boolean', initialValue: false }),
    defineField({
      name: 'ogImage',
      title: 'Social Share Image',
      type: 'image',
      options: { hotspot: true },
    }),
  ],
});

// Shared SEO fields array for spreading into post/page.
export const seoFields = [
  defineField({ name: 'seo', title: 'SEO', type: 'seo' }),
];
