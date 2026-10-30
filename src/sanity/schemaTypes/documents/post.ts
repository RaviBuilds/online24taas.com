import { defineType, defineField, defineArrayMember } from 'sanity';
import { DocumentTextIcon } from '@sanity/icons';
import { seoFields } from '../objects/seo';

// Post — deterministic _id: post-<wpPostId>. 660 published + 19 drafts.
// URL pattern (approved): /blog/<slug>. Body is Portable Text; bodyHtml keeps raw legacy HTML
// for posts where a safe PT transform is not possible (rendered sanitized on the frontend).
export const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [{ name: 'seo', title: 'SEO' }],
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: (r) => r.required() }),
    defineField({ name: 'publishedAt', title: 'Published At', type: 'datetime', description: 'Original WordPress post_date (preserved for traceability).' }),
    defineField({ name: 'modifiedAt', title: 'Modified At', type: 'datetime' }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3 }),
    defineField({ name: 'body', title: 'Body', type: 'blockContent' }),
    defineField({ name: 'bodyHtml', title: 'Body HTML (fallback)', type: 'text', rows: 8, description: 'Raw legacy HTML when PT transform is unsafe. Rendered sanitized; never trusted as-is.' }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', type: 'string', title: 'Alt text' },
        { name: 'caption', type: 'string', title: 'Caption' },
        { name: 'wpAttachmentId', type: 'number', title: 'WordPress Attachment ID' },
      ],
    }),
    defineField({ name: 'author', title: 'Author', type: 'reference', to: [{ type: 'author' }] }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'category' }] })],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'tag' }] })],
    }),
    defineField({ name: 'sourceFormat', title: 'Source Format', type: 'string', options: { list: ['gutenberg', 'legacy-html', 'empty'] } }),
    defineField({ name: 'wpPostId', title: 'WordPress Post ID', type: 'number', description: 'For reconciliation + idempotent re-import.' }),
    defineField({ name: 'legacyUrl', title: 'Legacy URL', type: 'string', description: 'https://www.online24taas.com/?p=<id> — source for the 301 redirect map.' }),
    ...seoFields,
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current', media: 'featuredImage' },
  },
});
