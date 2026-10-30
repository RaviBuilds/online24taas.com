import { defineType, defineField } from 'sanity';
import { ImageIcon } from '@sanity/icons';

// Media asset wrapper — deterministic _id: asset-<wpAttachmentId>. 799 attachments in source.
// Uploads happen in Phase 3; schema exists now so references resolve. Keeps WP provenance + alt/caption.
export const mediaAsset = defineType({
  name: 'mediaAsset',
  title: 'Media Asset',
  type: 'document',
  icon: ImageIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'file', title: 'File (non-image)', type: 'file' }),
    defineField({ name: 'alt', title: 'Alt Text', type: 'string' }),
    defineField({ name: 'caption', title: 'Caption', type: 'text' }),
    defineField({ name: 'originalPath', title: 'Original Upload Path', type: 'string', description: 'e.g. 2022/09/home.jpg under wp-content/uploads' }),
    defineField({ name: 'sourceUrl', title: 'Source URL', type: 'url' }),
    defineField({ name: 'wpAttachmentId', title: 'WordPress Attachment ID', type: 'number' }),
  ],
});
