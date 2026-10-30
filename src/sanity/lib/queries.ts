// All public GROQ lives here. Every list query filters on defined(slug.current) and relies on the
// 'published' perspective of the client (plus an explicit drafts guard) so drafts never leak.
const NOT_DRAFT = `!(_id in path("drafts.**"))`;

export const POST_CARD = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  excerpt,
  "image": featuredImage{ alt, caption, "ref": asset._ref },
  "categories": categories[]->{ title, "slug": slug.current },
  "authorName": author->name
}`;

export const SITE_QUERY = /* groq */ `{
  "settings": *[_id == "siteSettings"][0]{
    title, tagline, adsensePublisherId, footerText, socialLinks[]{ label, url },
    "logoRef": logo.asset._ref, "faviconRef": favicon.asset._ref
  },
  "menu": *[_type == "menu" && location == "primary"][0]{
    items[]{ label, url, "target": ref->{ _type, title, "slug": slug.current } }
  },
  "pages": *[_type == "page" && ${NOT_DRAFT} && defined(slug.current)] | order(title asc){ title, "slug": slug.current },
  "categories": *[_type == "category" && ${NOT_DRAFT}] | order(title asc){ title, "slug": slug.current, "count": count(*[_type == "post" && ^._id in categories[]._ref && ${NOT_DRAFT}]) }
}`;

export const BANNER_QUERY = /* groq */ `*[_id == "siteSettings"][0].featuredPosts[]->${POST_CARD}`;

export const LATEST_QUERY = /* groq */ `*[_type == "post" && ${NOT_DRAFT} && defined(slug.current)] | order(publishedAt desc) [$from...$to] ${POST_CARD}`;
export const LATEST_COUNT = /* groq */ `count(*[_type == "post" && ${NOT_DRAFT} && defined(slug.current)])`;

export const CATEGORY_QUERY = /* groq */ `*[_type == "category" && slug.current == $slug && ${NOT_DRAFT}][0]{
  title, description, "slug": slug.current,
  "total": count(*[_type == "post" && ^._id in categories[]._ref && ${NOT_DRAFT}]),
  "posts": *[_type == "post" && ^._id in categories[]._ref && ${NOT_DRAFT}] | order(publishedAt desc) [$from...$to] ${POST_CARD}
}`;

export const TAG_QUERY = /* groq */ `*[_type == "tag" && slug.current == $slug && ${NOT_DRAFT}][0]{
  title, "slug": slug.current,
  "total": count(*[_type == "post" && ^._id in tags[]._ref && ${NOT_DRAFT}]),
  "posts": *[_type == "post" && ^._id in tags[]._ref && ${NOT_DRAFT}] | order(publishedAt desc) [$from...$to] ${POST_CARD}
}`;

export const AUTHOR_QUERY = /* groq */ `*[_type == "author" && slug.current == $slug][0]{
  name, bio, "slug": slug.current,
  "total": count(*[_type == "post" && references(^._id) && ${NOT_DRAFT}]),
  "posts": *[_type == "post" && author._ref == ^._id && ${NOT_DRAFT}] | order(publishedAt desc) [$from...$to] ${POST_CARD}
}`;

export const POST_QUERY = /* groq */ `*[_type == "post" && slug.current == $slug && ${NOT_DRAFT}][0]{
  _id, title, "slug": slug.current, publishedAt, modifiedAt, excerpt, wpPostId,
  "image": featuredImage{ alt, caption, "ref": asset._ref },
  body[]{
    ...,
    _type == "image" => { ..., "ref": asset._ref }
  },
  "categories": categories[]->{ _id, title, "slug": slug.current },
  "tags": tags[]->{ title, "slug": slug.current },
  "author": author->{ name, "slug": slug.current },
  seo{ seoTitle, metaDescription, canonicalUrl, noIndex, "ogRef": ogImage.asset._ref }
}`;

export const ADJACENT_QUERY = /* groq */ `{
  "prev": *[_type == "post" && ${NOT_DRAFT} && defined(slug.current) && publishedAt < $at] | order(publishedAt desc)[0]{ title, "slug": slug.current },
  "next": *[_type == "post" && ${NOT_DRAFT} && defined(slug.current) && publishedAt > $at] | order(publishedAt asc)[0]{ title, "slug": slug.current }
}`;

export const RELATED_QUERY = /* groq */ `*[_type == "post" && ${NOT_DRAFT} && defined(slug.current) && _id != $id && count(categories[@._ref in $cats]) > 0] | order(publishedAt desc)[0...4] ${POST_CARD}`;

export const PAGE_QUERY = /* groq */ `*[_type == "page" && slug.current == $slug && ${NOT_DRAFT}][0]{
  title, "slug": slug.current, publishedAt, modifiedAt,
  body[]{ ..., _type == "image" => { ..., "ref": asset._ref } },
  seo{ seoTitle, metaDescription, canonicalUrl, noIndex }
}`;

// Marathi search: `match` tokenises Devanagari text; prefix wildcard on each token for partial words.
export const SEARCH_QUERY = /* groq */ `{
  "total": count(*[_type == "post" && ${NOT_DRAFT} && defined(slug.current) && (title match $q || pt::text(body) match $q || excerpt match $q)]),
  "posts": *[_type == "post" && ${NOT_DRAFT} && defined(slug.current) && (title match $q || pt::text(body) match $q || excerpt match $q)] | order(publishedAt desc) [$from...$to] ${POST_CARD}
}`;

export const SITEMAP_QUERY = /* groq */ `{
  "posts": *[_type == "post" && ${NOT_DRAFT} && defined(slug.current)]{ "slug": slug.current, "updated": coalesce(modifiedAt, publishedAt) },
  "pages": *[_type == "page" && ${NOT_DRAFT} && defined(slug.current)]{ "slug": slug.current, "updated": coalesce(modifiedAt, publishedAt) },
  "categories": *[_type == "category"]{ "slug": slug.current },
  "tags": *[_type == "tag" && count(*[_type == "post" && ^._id in tags[]._ref]) > 0]{ "slug": slug.current }
}`;

export const FEED_QUERY = /* groq */ `*[_type == "post" && ${NOT_DRAFT} && defined(slug.current)] | order(publishedAt desc)[0...30]{
  title, "slug": slug.current, publishedAt, excerpt, "category": categories[0]->title,
  "image": featuredImage{ "ref": asset._ref },
  "text": pt::text(body)
}`;

export const LEGACY_POST_QUERY = /* groq */ `*[(_type == "post" || _type == "page") && wpPostId == $id && ${NOT_DRAFT}][0]{ _type, "slug": slug.current }`;
export const LEGACY_CATEGORY_QUERY = /* groq */ `*[_type == "category" && wpTermId == $id][0]{ "slug": slug.current }`;
export const LEGACY_TAG_QUERY = /* groq */ `*[_type == "tag" && (sourceSlug == $slug || slug.current == $slug)][0]{ "slug": slug.current }`;
export const LEGACY_MEDIA_QUERY = /* groq */ `*[_type == "mediaAsset" && originalPath == $path][0]{ "url": coalesce(image.asset->url, file.asset->url) }`;
export const REDIRECT_QUERY = /* groq */ `*[_type == "redirect" && source == $path][0]{ destination, permanent }`;
