import { defineType, defineField } from 'sanity';

// Source Yoast data held no custom titles/descriptions, so every field is optional and the website
// falls back to the title / excerpt.
export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({ name: 'seoTitle', title: 'SEO title', type: 'string', validation: (r) => r.max(70).warning('Over 70 characters may be truncated in search results.') }),
    defineField({ name: 'metaDescription', title: 'Meta description', type: 'text', rows: 3, validation: (r) => r.max(200).warning('Keep under ~160 characters.') }),
    defineField({ name: 'canonicalUrl', title: 'Canonical URL override', type: 'url' }),
    defineField({ name: 'focusKeyword', title: 'Focus keyword', type: 'string' }),
    defineField({ name: 'noIndex', title: 'Hide from search engines', type: 'boolean', initialValue: false }),
    defineField({ name: 'ogImage', title: 'Social share image', type: 'image', options: { hotspot: true } }),
  ],
});

export const seoFields = [defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'seo' })];
