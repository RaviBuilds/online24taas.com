import Link from 'next/link';
import type { SiteData } from '@/lib/data';
import { categoryPath, pagePath } from '@/lib/urls';
import { SITE_NAME } from '@/lib/site';
import { ContactForm } from './ContactForm';

export function Footer({ site }: { site: SiteData }) {
  return (
    <footer className="mt-12 bg-ink text-neutral-200">
      <div className="theme-wrapper grid gap-8 py-10 md:grid-cols-3">
        <section>
          <h2 className="mb-3 text-lg font-bold text-white">{site.settings?.title || SITE_NAME}</h2>
          <p className="text-sm">Thanks for reaching here 🙂</p>
          <p className="mt-2 text-sm">If you have any queries regarding contents please write on below email:</p>
          <a className="text-sm underline" href="mailto:ajit@online24taas.com">ajit@online24taas.com</a>
          <h3 className="mt-6 mb-2 font-semibold text-white">महत्त्वाची पाने</h3>
          <ul className="space-y-1 text-sm">
            {site.pages.map((p) => (
              <li key={p.slug}><Link className="hover:underline" href={pagePath(p.slug)}>⦿ {p.title}</Link></li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold text-white">विभाग</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {site.categories.filter((c) => c.count > 0).map((c) => (
              <li key={c.slug}><Link className="hover:underline" href={categoryPath(c.slug)}>⦿ {c.title}</Link></li>
            ))}
          </ul>
        </section>
        <section id="contact">
          <h2 className="mb-3 text-lg font-bold text-white">संपर्क</h2>
          <ContactForm />
        </section>
      </div>
      <div className="border-t border-neutral-700 py-4 text-center text-sm">{site.settings?.footerText || `© ${SITE_NAME}`}</div>
    </footer>
  );
}
