import { defineType, defineField } from 'sanity';
import { TagIcon } from '@sanity/icons';
import { slugify } from '../../lib/slugify';

// Category — deterministic _id: category-<wpTermId>. Public URL: /category/<slug>.
export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', slugify: (i: string) => slugify(i, 60) }, validation: (r) => r.required() }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
    defineField({ name: 'wpTermId', title: 'WordPress term ID', type: 'number', readOnly: true }),
    defineField({ name: 'sourceSlug', title: 'Original WordPress slug', type: 'string', readOnly: true }),
  ],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
});
