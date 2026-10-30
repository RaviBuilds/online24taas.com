import { defineType, defineField, defineArrayMember } from 'sanity';
import { DocumentIcon } from '@sanity/icons';
import { seoFields } from '../objects/seo';

// Page — deterministic _id: page-<wpPostId>. 5 published pages (about-us, disclaimer, etc.).
// Rendered at top-level routes (approved): /about, /contact, etc., mapped from slug.
export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  groups: [{ name: 'seo', title: 'SEO' }],
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: (r) => r.required() }),
    defineField({ name: 'publishedAt', title: 'Published At', type: 'datetime' }),
    defineField({ name: 'modifiedAt', title: 'Modified At', type: 'datetime' }),
    defineField({ name: 'body', title: 'Body', type: 'blockContent' }),
    defineField({ name: 'bodyHtml', title: 'Body HTML (fallback)', type: 'text', rows: 8 }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', type: 'string', title: 'Alt text' },
        { name: 'wpAttachmentId', type: 'number', title: 'WordPress Attachment ID' },
      ],
    }),
    defineField({ name: 'sourceFormat', title: 'Source Format', type: 'string', options: { list: ['gutenberg', 'legacy-html', 'empty'] } }),
    defineField({ name: 'wpPostId', title: 'WordPress Post ID', type: 'number' }),
    defineField({ name: 'legacyUrl', title: 'Legacy URL', type: 'string' }),
    ...seoFields,
  ],
  preview: { select: { title: 'title', subtitle: 'slug.current', media: 'featuredImage' } },
});
