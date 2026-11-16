import Link from '@/components/AppLink';
import { Illustration } from '@/components/Illustration';
import { SearchForm } from '@/components/SearchForm';
import { Icon } from '@/components/Icon';

export const metadata = { title: 'पृष्ठ सापडले नाही', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="theme-wrapper grid place-items-center py-12 text-center sm:py-20">
      <Illustration name="notfound" className="w-full max-w-sm text-ink/75" />
      <p className="hl mt-4 text-[3.5rem] leading-none text-brand">404</p>
      <h1 className="hl mt-3 text-[1.75rem] sm:text-[2.25rem]">हे पृष्ठ सापडले नाही</h1>
      <p className="mt-2 max-w-md text-muted">तुम्ही शोधत असलेले पृष्ठ अस्तित्वात नाही किंवा हलवले गेले आहे. खाली शोधून पहा किंवा मुख्यपृष्ठावर परत जा.</p>
      <SearchForm className="mt-6 w-full max-w-md" id="nf-search" />
      <Link href="/" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 font-bold text-white transition-colors hover:bg-brand">
        <Icon name="arrowLeft" className="size-4" /> मुख्यपृष्ठावर जा
      </Link>
    </div>
  );
}
