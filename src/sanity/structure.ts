import type { StructureResolver } from 'sanity/structure';

// Singleton Site settings at the top, then content types.
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem().title('Site settings').id('siteSettings').child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.divider(),
      S.documentTypeListItem('post').title('Posts'),
      S.documentTypeListItem('page').title('Pages'),
      S.documentTypeListItem('category').title('Categories'),
      S.documentTypeListItem('tag').title('Tags'),
      S.documentTypeListItem('author').title('Authors'),
      S.divider(),
      S.documentTypeListItem('menu').title('Navigation menus'),
      S.documentTypeListItem('redirect').title('Redirects'),
      S.documentTypeListItem('mediaAsset').title('Media records'),
    ]);
