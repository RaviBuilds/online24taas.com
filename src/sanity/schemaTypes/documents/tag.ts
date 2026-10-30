import { defineType, defineField } from 'sanity';
import { TagIcon } from '@sanity/icons';

// Tag — deterministic _id: tag-<wpTermId>. 89 tags in source.
export const tag = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'wpTermId', title: 'WordPress Term ID', type: 'number' }),
  ],
});
