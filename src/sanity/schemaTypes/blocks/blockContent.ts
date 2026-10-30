import { defineType, defineArrayMember } from 'sanity';

export const blockContent = defineType({
  name: 'blockContent',
  title: 'Body Content',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'H1', value: 'h1' },
        { title: 'H2', value: 'h2' },
        { title: 'H3', value: 'h3' },
        { title: 'H4', value: 'h4' },
        { title: 'H5', value: 'h5' },
        { title: 'H6', value: 'h6' },
        { title: 'Quote', value: 'blockquote' },
      ],
      lists: [{ title: 'Bullet', value: 'bullet' }, { title: 'Numbered', value: 'number' }],
      marks: {
        decorators: [
          { title: 'Strong', value: 'strong' },
          { title: 'Emphasis', value: 'em' },
          { title: 'Underline', value: 'underline' },
        ],
        annotations: [
          { name: 'link', type: 'object', title: 'Link', fields: [{ name: 'href', type: 'url', title: 'URL', validation: (r) => r.required() }] },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', type: 'string', title: 'Alt text' },
        { name: 'caption', type: 'string', title: 'Caption' },
        { name: 'wpAttachmentId', type: 'number', title: 'WordPress Attachment ID' },
        { name: 'src', type: 'string', title: 'Source URL (pre-import)' },
      ],
    }),
    defineArrayMember({ type: 'rawHtml' }),
  ],
});

export const rawHtml = defineType({
  name: 'rawHtml',
  title: 'Raw HTML',
  type: 'object',
  fields: [
    { name: 'html', type: 'text', title: 'HTML', rows: 6 },
    { name: 'blockName', type: 'string', title: 'Source block (if any)' },
    { name: 'text', type: 'string', title: 'Extracted text' },
  ],
  preview: { prepare() { return { title: 'Raw HTML block' }; } },
});
