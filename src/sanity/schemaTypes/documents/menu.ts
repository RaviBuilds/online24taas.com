import { defineType, defineField, defineArrayMember } from 'sanity';
import { MenuIcon } from '@sanity/icons';

// Navigation menu — deterministic _id: menu-<wpTermId>. "primary" drives the header navigation,
// "social" the social links.
const menuItem = defineArrayMember({
  type: 'object',
  name: 'menuItem',
  fields: [
    defineField({ name: 'label', title: 'Label', type: 'string' }),
    defineField({ name: 'ref', title: 'Internal target', type: 'reference', weak: true, to: [{ type: 'category' }, { type: 'page' }, { type: 'post' }, { type: 'tag' }] }),
    defineField({ name: 'url', title: 'External / custom URL', type: 'string' }),
  ],
  preview: { select: { title: 'label', subtitle: 'url' } },
});

export const menu = defineType({
  name: 'menu',
  title: 'Navigation menu',
  type: 'document',
  icon: MenuIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'location', title: 'Location', type: 'string', options: { list: ['primary', 'social', 'footer'] } }),
    defineField({ name: 'items', title: 'Items', type: 'array', of: [menuItem] }),
  ],
  preview: { select: { title: 'title', subtitle: 'location' } },
});
