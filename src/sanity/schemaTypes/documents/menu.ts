import { defineType, defineField, defineArrayMember } from 'sanity';
import { MenuIcon } from '@sanity/icons';

// Navigation menu — deterministic _id: menu-<wpTermTaxonomyId>. 2 nav menus in source
// ("top level menu" -> categories, "social" -> custom links).
const menuItem = defineArrayMember({
  type: 'object',
  name: 'menuItem',
  fields: [
    defineField({ name: 'label', title: 'Label', type: 'string' }),
    defineField({ name: 'type', title: 'Type', type: 'string', options: { list: ['category', 'post', 'page', 'custom', 'internal'] } }),
    defineField({ name: 'url', title: 'URL', type: 'string' }),
    defineField({ name: 'ref', title: 'Reference', type: 'reference', weak: true, to: [{ type: 'category' }, { type: 'post' }, { type: 'page' }] }),
  ],
  preview: { select: { title: 'label', subtitle: 'url' } },
});

export const menu = defineType({
  name: 'menu',
  title: 'Navigation Menu',
  type: 'document',
  icon: MenuIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' } }),
    defineField({ name: 'wpTermTaxonomyId', title: 'WP Term Taxonomy ID', type: 'number' }),
    defineField({ name: 'items', title: 'Items', type: 'array', of: [menuItem] }),
  ],
});
