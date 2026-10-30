'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="theme-wrapper py-20 text-center">
      <h1 className="text-2xl font-bold">काहीतरी चुकले</h1>
      <p className="mt-2 text-neutral-600">पृष्ठ लोड होऊ शकले नाही. कृपया पुन्हा प्रयत्न करा.</p>
      <button type="button" onClick={reset} className="mt-6 bg-primary px-5 py-2 font-semibold text-white hover:bg-primary-dark">पुन्हा प्रयत्न करा</button>
    </div>
  );
}
