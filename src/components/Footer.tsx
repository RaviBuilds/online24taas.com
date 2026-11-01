import Link from './AppLink';
import { sanityFetch } from '@/sanity/lib/client';
import { FOOTER_QUERY } from '@/sanity/lib/queries';
import type { SiteData } from '@/lib/data';
import { categoryPath, pagePath, postPath } from '@/lib/urls';
import { FOOTER_LOGO_WP_ATTACHMENT_ID, FOOTER_PAGE_SLUGS, FOOTER_STORY_WP_IDS, FOOTER_TOPIC_WP_IDS } from '@/lib/footer';
import { SITE_NAME } from '@/lib/site';
import { ContactForm } from './ContactForm';
import { SanityImage } from './SanityImage';
import { ScrollToTop } from './ScrollToTop';

interface FooterData {
  stories: { wpPostId: number; title: string; slug: string }[];
  topics: { wpTermId: number; title: string; slug: string }[];
  logoRef?: string | null;
}

const byOrder = <T,>(items: T[], ids: number[], key: (t: T) => number) => ids.map((id) => items.find((i) => key(i) === id)).filter((x): x is T => !!x);

function LinkList({ items }: { items: { href: string; label: string }[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((l) => (
        <li key={l.href} className="flex gap-1.5">
          <span aria-hidden>⦿</span>
          <Link className="opacity-80 hover:opacity-100 [overflow-wrap:anywhere]" href={l.href}>{l.label}</Link>
        </li>
      ))}
    </ul>
  );
}

/** Adore News footer: four widget columns on #1c1c1c and a centred copyright line. */
export async function Footer({ site }: { site: SiteData }) {
  const data = await sanityFetch<FooterData>(FOOTER_QUERY, { storyIds: FOOTER_STORY_WP_IDS, topicIds: FOOTER_TOPIC_WP_IDS, logoWpId: FOOTER_LOGO_WP_ATTACHMENT_ID }, ['site', 'posts', 'taxonomy']);
  const stories = byOrder(data.stories, FOOTER_STORY_WP_IDS, (s) => s.wpPostId).map((s) => ({ href: postPath(s.slug), label: s.title }));
  const topics = byOrder(data.topics, FOOTER_TOPIC_WP_IDS, (t) => t.wpTermId).map((t) => ({ href: categoryPath(t.slug), label: t.title }));
  const pages = FOOTER_PAGE_SLUGS.map((slug) => site.pages.find((p) => p.slug === slug)).filter((p): p is { title: string; slug: string } => !!p).map((p) => ({ href: pagePath(p.slug), label: p.title }));
  const name = site.settings?.title || SITE_NAME;
  return (
    <footer className="site-footer mt-[50px] bg-footer pt-[50px] text-white">
      <div className="theme-wrapper grid gap-x-[30px] gap-y-10 min-[481px]:grid-cols-2 min-[769px]:grid-cols-4">
        <section aria-label={name}>
          {(data.logoRef || site.settings?.logoRef) && <SanityImage imageRef={(data.logoRef || site.settings?.logoRef) as string} alt={name} sizes="160px" className="mb-4 size-32 object-contain" />}
          <p className="text-[1.1rem] font-bold">Thanks for reaching here 🙂</p>
          <p className="mt-4 text-[0.95rem]">If you have any queries regarding contents please write on below email 👇🏻</p>
          <p className="mt-3"><a className="underline opacity-90 hover:opacity-100" href="mailto:ajit@online24taas.com">ajit@online24taas.com</a></p>
        </section>
        <section>
          <h2 className="section-title">Trending Stories</h2>
          <LinkList items={stories} />
        </section>
        <section>
          <h2 className="section-title">Trending Topics</h2>
          <LinkList items={topics} />
          <h2 className="section-title mt-8">Footer Menu</h2>
          <LinkList items={pages} />
        </section>
        <section id="contact">
          <h2 className="section-title">संपर्क</h2>
          <ContactForm />
        </section>
      </div>
      <div className="mt-10 py-4 text-center text-[0.9rem]">
        <div className="theme-wrapper">Copyright © {new Date().getFullYear()} <Link className="underline opacity-90 hover:opacity-100" href="/">{name}</Link></div>
      </div>
      <ScrollToTop />
    </footer>
  );
}
