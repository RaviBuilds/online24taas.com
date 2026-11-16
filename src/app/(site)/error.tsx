'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="theme-wrapper py-20 text-center">
      <h1 className="hl text-[1.75rem]">काहीतरी चुकले</h1>
      <p className="mt-2 text-muted">पृष्ठ लोड होऊ शकले नाही. कृपया पुन्हा प्रयत्न करा.</p>
      <button type="button" onClick={reset} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-bold text-white transition-colors hover:bg-brand-dark">पुन्हा प्रयत्न करा</button>
    </div>
  );
}
