import { defineType, defineField } from 'sanity';
import { DocumentIcon } from '@sanity/icons';
import { seoFields } from '../objects/seo';
import { slugify } from '../../lib/slugify';

// Page — deterministic _id: page-<wpPostId>. Public URL: /<slug>.
export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' },
    { name: 'source', title: 'WordPress source' },
  ],
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', group: 'content', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title', maxLength: 96, slugify: (input: string) => slugify(input, 90) },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'publishedAt', title: 'Published at', type: 'datetime', group: 'content' }),
    defineField({ name: 'modifiedAt', title: 'Last modified', type: 'datetime', group: 'content' }),
    defineField({ name: 'body', title: 'Body', type: 'blockContent', group: 'content' }),
    ...seoFields,
    defineField({ name: 'wpPostId', title: 'WordPress post ID', type: 'number', group: 'source', readOnly: true }),
    defineField({ name: 'sourceFormat', title: 'Source format', type: 'string', group: 'source', readOnly: true }),
    defineField({ name: 'legacyUrl', title: 'Legacy URL', type: 'string', group: 'source', readOnly: true }),
  ],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
});
