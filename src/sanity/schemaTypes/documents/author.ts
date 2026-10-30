import { defineType, defineField } from 'sanity';
import { UserIcon } from '@sanity/icons';
import { slugify } from '../../lib/slugify';

// Author — deterministic _id: author-<wpUserId>. WordPress had one author (user 1).
// The WordPress login name and e-mail are intentionally not migrated (PII).
export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'name', slugify: (i: string) => slugify(i, 60) } }),
    defineField({ name: 'bio', title: 'Short bio', type: 'text', rows: 3 }),
    defineField({ name: 'wpUserId', title: 'WordPress user ID', type: 'number', readOnly: true }),
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
});
