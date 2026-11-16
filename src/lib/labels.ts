// Marathi display titles for the static pages that were migrated with English titles.
// Display only: the page documents, slugs and metadata stay exactly as they are in Sanity.
const PAGE_LABELS: Record<string, string> = {
  'about-us': 'आमच्याबद्दल',
  disclaimer: 'अस्वीकरण',
  'privacy-policy': 'गोपनीयता धोरण',
  'terms-and-conditions': 'अटी व शर्ती',
};
export const pageLabel = (slug: string, title: string) => PAGE_LABELS[slug] ?? title;
