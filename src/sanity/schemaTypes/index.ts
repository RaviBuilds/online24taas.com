import type { SchemaTypeDefinition } from 'sanity';
import { author } from './documents/author';
import { category } from './documents/category';
import { tag } from './documents/tag';
import { post } from './documents/post';
import { page } from './documents/page';
import { mediaAsset } from './documents/mediaAsset';
import { menu } from './documents/menu';
import { redirect } from './documents/redirect';
import { siteSettings } from './documents/siteSettings';
import { seo } from './objects/seo';
import { blockContent, rawHtml } from './blocks/blockContent';

export const schemaTypes: SchemaTypeDefinition[] = [
  post, page, category, tag, author, mediaAsset, menu, redirect, siteSettings,
  seo, blockContent, rawHtml,
];
