import { defineType, defineField } from 'sanity';
import { TagIcon } from '@sanity/icons';

// Category — deterministic _id: category-<wpTermId>. 14 categories in source.
export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'description', title: 'Description', type: 'text' }),
    defineField({ name: 'wpTermId', title: 'WordPress Term ID', type: 'number' }),
  ],
});
