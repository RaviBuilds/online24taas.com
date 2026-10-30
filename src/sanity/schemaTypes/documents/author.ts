import { defineType, defineField } from 'sanity';
import { UserIcon } from '@sanity/icons';

// Author — deterministic _id: author-<wpUserId>. WordPress had a single author (user 1).
export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'name' } }),
    defineField({ name: 'wpUserId', title: 'WordPress User ID', type: 'number', description: 'Source WP user ID for reconciliation / idempotent import.' }),
  ],
});
