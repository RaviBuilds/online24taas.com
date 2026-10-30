import { defineType, defineField } from 'sanity';
import { TagIcon } from '@sanity/icons';
import { slugify } from '../../lib/slugify';

// Tag — deterministic _id: tag-<wpTermId>. Public URL: /tag/<slug>.
export const tag = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', slugify: (i: string) => slugify(i, 60) }, validation: (r) => r.required() }),
    defineField({ name: 'wpTermId', title: 'WordPress term ID', type: 'number', readOnly: true }),
    defineField({ name: 'sourceSlug', title: 'Original WordPress slug', type: 'string', readOnly: true }),
  ],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
});
