import { defineType, defineField } from 'sanity';
import { ArrowTopRightIcon } from '@sanity/icons';

// Redirect — deterministic _id: redirect-<hash>. Populated in Phase 5 from the legacy ?p=N map.
// Kept as data (reversible) per the migration plan's rollback strategy.
export const redirect = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',
  icon: ArrowTopRightIcon,
  fields: [
    defineField({ name: 'source', title: 'Source (legacy path or ?p=id)', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'destination', title: 'Destination (new URL)', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'permanent', title: 'Permanent (301)', type: 'boolean', initialValue: true }),
  ],
});
