import Link from 'next/link';

export const metadata = { title: 'पृष्ठ सापडले नाही', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="theme-wrapper py-20 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">हे पृष्ठ सापडले नाही</h1>
      <p className="mt-2 text-neutral-600">तुम्ही शोधत असलेले पृष्ठ अस्तित्वात नाही किंवा हलवले गेले आहे.</p>
      <p className="mt-6"><Link href="/" className="bg-primary px-5 py-2 font-semibold text-white hover:bg-primary-dark">मुख्यपृष्ठावर जा</Link></p>
    </div>
  );
}
