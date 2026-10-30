import { defineType, defineArrayMember, defineField } from 'sanity';

// Portable Text body shared by posts and pages.
// `center` is a paragraph style that preserves WordPress "has-text-align-center" paragraphs.
export const blockContent = defineType({
  name: 'blockContent',
  title: 'Body Content',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'Centered paragraph', value: 'center' },
        { title: 'Heading 1', value: 'h1' },
        { title: 'Heading 2', value: 'h2' },
        { title: 'Heading 3', value: 'h3' },
        { title: 'Heading 4', value: 'h4' },
        { title: 'Heading 5', value: 'h5' },
        { title: 'Heading 6', value: 'h6' },
        { title: 'Quote', value: 'blockquote' },
      ],
      lists: [
        { title: 'Bullet', value: 'bullet' },
        { title: 'Numbered', value: 'number' },
      ],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
          { title: 'Underline', value: 'underline' },
          { title: 'Strike', value: 'strike-through' },
          { title: 'Highlight', value: 'highlight' },
          { title: 'Code', value: 'code' },
          { title: 'Superscript', value: 'sup' },
          { title: 'Subscript', value: 'sub' },
        ],
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [
              defineField({
                name: 'href',
                type: 'url',
                title: 'URL',
                validation: (r) => r.required().uri({ scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: true }),
              }),
              defineField({ name: 'blank', type: 'boolean', title: 'Open in new tab', initialValue: false }),
            ],
          },
          {
            name: 'textColor',
            type: 'object',
            title: 'Text colour',
            fields: [
              defineField({
                name: 'color',
                type: 'string',
                title: 'Colour',
                options: {
                  list: [
                    { title: 'Red', value: 'vivid-red' },
                    { title: 'Blue', value: 'vivid-cyan-blue' },
                    { title: 'Purple', value: 'vivid-purple' },
                    { title: 'Orange', value: 'luminous-vivid-orange' },
                    { title: 'Green', value: 'vivid-green-cyan' },
                    { title: 'Black', value: 'black' },
                  ],
                },
              }),
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', type: 'string', title: 'Alt text' }),
        defineField({ name: 'caption', type: 'string', title: 'Caption' }),
        defineField({ name: 'wpAttachmentId', type: 'number', title: 'WordPress attachment ID', readOnly: true }),
        defineField({ name: 'sourceUrl', type: 'string', title: 'Original URL (only if no asset)', readOnly: true }),
      ],
    }),
    defineArrayMember({ type: 'rawHtml' }),
  ],
});

export const rawHtml = defineType({
  name: 'rawHtml',
  title: 'Embedded HTML',
  type: 'object',
  fields: [
    defineField({ name: 'html', type: 'text', title: 'HTML', rows: 6, description: 'Sanitised on the website. Only allow-listed embeds (e.g. Amazon ads) render iframes.' }),
    defineField({ name: 'blockName', type: 'string', title: 'Source element', readOnly: true }),
    defineField({ name: 'text', type: 'string', title: 'Extracted text', readOnly: true }),
  ],
  preview: {
    select: { title: 'blockName', subtitle: 'text' },
    prepare: ({ title, subtitle }: { title?: string; subtitle?: string }) => ({ title: `HTML embed${title ? ` (${title})` : ''}`, subtitle }),
  },
});
