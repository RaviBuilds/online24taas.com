import { defineType, defineField } from 'sanity';
import { CogIcon } from '@sanity/icons';

// Singleton (_id: siteSettings). Mirrors WordPress options + Adore News theme mods.
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({ name: 'title', title: 'Site title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'string' }),
    defineField({ name: 'logo', title: 'Logo', type: 'image' }),
    defineField({ name: 'favicon', title: 'Favicon / site icon', type: 'image' }),
    defineField({
      name: 'featuredPosts',
      title: 'Homepage banner posts',
      description: 'Shown in the banner/slider at the top of the home page (WordPress theme setting).',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'post' }] }],
      validation: (r) => r.max(5),
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      of: [{ type: 'object', fields: [defineField({ name: 'label', type: 'string' }), defineField({ name: 'url', type: 'url' })], preview: { select: { title: 'label', subtitle: 'url' } } }],
    }),
    defineField({ name: 'adsensePublisherId', title: 'Google AdSense publisher ID', type: 'string', description: 'e.g. ca-pub-1234567890123456. Leave empty to disable ads.' }),
    defineField({ name: 'footerText', title: 'Footer text', type: 'string' }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});
