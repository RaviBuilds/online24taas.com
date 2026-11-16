import Link from './AppLink';
import { sanityFetch } from '@/sanity/lib/client';
import { FOOTER_QUERY } from '@/sanity/lib/queries';
import type { SiteData } from '@/lib/data';
import { categoryPath, pagePath, postPath } from '@/lib/urls';
import { FOOTER_LOGO_WP_ATTACHMENT_ID, FOOTER_PAGE_SLUGS, FOOTER_STORY_WP_IDS, FOOTER_TOPIC_WP_IDS } from '@/lib/footer';
import { pageLabel } from '@/lib/labels';
import { formatNumber, PUBLICATION_BYLINE } from '@/lib/present';
import { ContactForm } from './ContactForm';
import { SanityImage } from './SanityImage';
import { ScrollToTop } from './ScrollToTop';
import { SocialLinks } from './SocialLinks';
import { WarliBand } from './Illustration';
import { Icon } from './Icon';

interface FooterData {
  stories: { wpPostId: number; title: string; slug: string }[];
  topics: { wpTermId: number; title: string; slug: string }[];
  logoRef?: string | null;
}

const byOrder = <T,>(items: T[], ids: number[], key: (t: T) => number) => ids.map((id) => items.find((i) => key(i) === id)).filter((x): x is T => !!x);

function LinkList({ items }: { items: { href: string; label: string }[] }) {
  return (
    <ul>
      {items.map((l) => (
        <li key={l.href}>
          <Link className="group flex min-h-11 items-center gap-2 py-1 text-[0.97rem] text-white/80 transition-colors hover:text-saffron [overflow-wrap:anywhere]" href={l.href}>
            <Icon name="chevronRight" className="size-3.5 shrink-0 text-saffron transition-transform group-hover:translate-x-0.5" />
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Heading({ children, id }: { children: string; id?: string }) {
  return <h2 id={id} className="mb-3 flex items-center gap-2.5 text-[1.125rem] font-extrabold text-white before:h-[1.1em] before:w-[5px] before:rounded-sm before:bg-saffron">{children}</h2>;
}

export async function Footer({ site }: { site: SiteData }) {
  const data = await sanityFetch<FooterData>(FOOTER_QUERY, { storyIds: FOOTER_STORY_WP_IDS, topicIds: FOOTER_TOPIC_WP_IDS, logoWpId: FOOTER_LOGO_WP_ATTACHMENT_ID }, ['site', 'posts', 'taxonomy']);
  const stories = byOrder(data.stories, FOOTER_STORY_WP_IDS, (s) => s.wpPostId).map((s) => ({ href: postPath(s.slug), label: s.title }));
  const topics = byOrder(data.topics, FOOTER_TOPIC_WP_IDS, (t) => t.wpTermId).map((t) => ({ href: categoryPath(t.slug), label: t.title }));
  const pages = FOOTER_PAGE_SLUGS.map((slug) => site.pages.find((p) => p.slug === slug)).filter((p): p is { title: string; slug: string } => !!p).map((p) => ({ href: pagePath(p.slug), label: pageLabel(p.slug, p.title) }));
  const social = site.settings?.socialLinks ?? [];
  const logo = data.logoRef || site.settings?.logoRef;
  return (
    <footer className="site-footer on-dark relative mt-16 overflow-hidden bg-footer text-white">
      <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-60" />
      <WarliBand className="relative -mb-2 h-14 text-white/[0.09]" />
      <div className="theme-wrapper relative grid gap-x-10 gap-y-10 pt-6 pb-10 sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1fr_1.2fr]">
        <section aria-label="ऑनलाईन२४तास">
          {logo && <SanityImage imageRef={logo} alt="ऑनलाईन२४तास" sizes="144px" className="mb-4 size-32 rounded-2xl object-contain" />}
          <p className="max-w-xs text-[0.97rem] leading-[1.8] text-white/80">मराठी बातम्या, अध्यात्म, आरोग्य, राशिभविष्य आणि रोजच्या आयुष्यातील रंजक गोष्टी, एकाच ठिकाणी.</p>
          <p className="mt-4 text-[0.9375rem] text-white/70">लेखांबद्दल काही सांगायचे असेल तर लिहा:</p>
          <a className="mt-1 inline-flex min-h-11 items-center gap-2 font-bold text-saffron underline-offset-4 hover:underline" href="mailto:ajit@online24taas.com">
            <Icon name="mail" className="size-5" /> ajit@online24taas.com
          </a>
          {social.length > 0 && <div className="mt-3"><SocialLinks links={social} variant="dark" /></div>}
        </section>
        {stories.length > 0 && (
          <section aria-labelledby="f-stories">
            <Heading id="f-stories">लोकप्रिय बातम्या</Heading>
            <LinkList items={stories} />
          </section>
        )}
        <section aria-label="विषय आणि दुवे">
          {topics.length > 0 && (
            <>
              <Heading>लोकप्रिय विषय</Heading>
              <LinkList items={topics} />
            </>
          )}
          {pages.length > 0 && (
            <>
              <div className="mt-7" />
              <Heading>महत्त्वाचे दुवे</Heading>
              <LinkList items={pages} />
            </>
          )}
        </section>
        <section id="contact" aria-labelledby="f-contact" className="scroll-mt-24 sm:col-span-2 lg:col-span-1">
          <Heading id="f-contact">संपर्क</Heading>
          <ContactForm />
        </section>
      </div>
      <div className="relative border-t border-white/10 py-5 text-center text-[0.875rem] text-white/70">
        <div className="theme-wrapper">© {formatNumber(new Date().getFullYear())} <Link className="font-semibold text-white underline-offset-4 hover:underline" href="/">{PUBLICATION_BYLINE}</Link>. सर्व हक्क राखीव.</div>
      </div>
      <ScrollToTop />
    </footer>
  );
}
