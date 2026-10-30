import { defineType, defineField } from 'sanity';
import { ArrowTopRightIcon } from '@sanity/icons';

// Editor-managed redirects (in addition to the automatic legacy ?p=ID handling in the middleware).
export const redirect = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',
  icon: ArrowTopRightIcon,
  fields: [
    defineField({ name: 'source', title: 'From path (e.g. /old-page)', type: 'string', validation: (r) => r.required().regex(/^\//, { name: 'starts with /' }) }),
    defineField({ name: 'destination', title: 'To (path or URL)', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'permanent', title: 'Permanent (301)', type: 'boolean', initialValue: true }),
  ],
  preview: { select: { title: 'source', subtitle: 'destination' } },
});
