/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineType, defineField, defineArrayMember } from 'sanity';
import { DocumentTextIcon } from '@sanity/icons';
import { seoFields } from '../objects/seo';
import { slugify } from '../../lib/slugify';

// Post — deterministic _id: post-<wpPostId> (WordPress drafts are imported as drafts.post-<id>).
// Public URL: /blog/<slug>. Image-led posts legitimately have an empty body.
export const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  icon: DocumentTextIcon,
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
    defineField({ name: 'publishedAt', title: 'Published at', type: 'datetime', group: 'content', initialValue: () => new Date().toISOString(), validation: (r) => r.required() }),
    defineField({ name: 'modifiedAt', title: 'Last modified', type: 'datetime', group: 'content' }),
    defineField({
      name: 'featuredImage',
      title: 'Featured image',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', type: 'string', title: 'Alt text' }),
        defineField({ name: 'caption', type: 'string', title: 'Caption' }),
        defineField({ name: 'wpAttachmentId', type: 'number', title: 'WordPress attachment ID', readOnly: true }),
      ],
    }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3, group: 'content' }),
    defineField({ name: 'body', title: 'Body', type: 'blockContent', group: 'content' }),
    defineField({ name: 'author', title: 'Author', type: 'reference', to: [{ type: 'author' }], group: 'content' }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'category' }] })],
      validation: (r) => r.unique(),
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'tag' }] })],
      validation: (r) => r.unique(),
    }),
    ...seoFields,
    defineField({ name: 'wpPostId', title: 'WordPress post ID', type: 'number', group: 'source', readOnly: true }),
    defineField({ name: 'wpStatus', title: 'WordPress status', type: 'string', group: 'source', readOnly: true }),
    defineField({ name: 'sourceFormat', title: 'Source format', type: 'string', group: 'source', readOnly: true, options: { list: ['gutenberg', 'legacy-html', 'empty'] } }),
    defineField({ name: 'legacyUrl', title: 'Legacy URL', type: 'string', group: 'source', readOnly: true }),
    defineField({ name: 'sourceSlug', title: 'Original WordPress slug', type: 'string', group: 'source', readOnly: true }),
  ],
  orderings: [
    { title: 'Published, newest first', name: 'publishedAtDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'publishedAt', media: 'featuredImage' },
    prepare: ({ title, subtitle, media }: { title?: string; subtitle?: string; media?: any }) => ({ title, subtitle: subtitle?.slice(0, 10), media }),
  },
});
