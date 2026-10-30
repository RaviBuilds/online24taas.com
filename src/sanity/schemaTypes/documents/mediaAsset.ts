import { defineType, defineField } from 'sanity';
import { ImageIcon } from '@sanity/icons';

// Media record — deterministic _id: mediaAsset-<wpAttachmentId>. One per WordPress attachment (799).
// Holds provenance and metadata next to the binary (image or file asset).
export const mediaAsset = defineType({
  name: 'mediaAsset',
  title: 'Media (WordPress attachment)',
  type: 'document',
  icon: ImageIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'file', title: 'File (non-image)', type: 'file' }),
    defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
    defineField({ name: 'caption', title: 'Caption', type: 'text', rows: 2 }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
    defineField({ name: 'mimeType', title: 'MIME type', type: 'string', readOnly: true }),
    defineField({ name: 'wpAttachmentId', title: 'WordPress attachment ID', type: 'number', readOnly: true }),
    defineField({ name: 'wpParentId', title: 'Attached to WordPress post ID', type: 'number', readOnly: true }),
    defineField({ name: 'originalPath', title: 'Original upload path', type: 'string', readOnly: true }),
    defineField({ name: 'legacyUrl', title: 'Legacy URL', type: 'url', readOnly: true }),
  ],
  preview: { select: { title: 'title', subtitle: 'originalPath', media: 'image' } },
});
