'use client';
import { useState } from 'react';

// Replaces Contact Form 7 (form id 7): name*, email*, subject*, message (optional). Spam control: a hidden
// honeypot field plus server-side validation and size limits in /api/contact.
export function ContactForm() {
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'ok' | 'error'; message?: string }>({ status: 'idle' });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState({ status: 'sending' });
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setState({ status: 'ok', message: 'धन्यवाद! तुमचा संदेश पाठवला गेला आहे.' });
        form.reset();
      } else setState({ status: 'error', message: json.error || 'संदेश पाठवता आला नाही. कृपया नंतर पुन्हा प्रयत्न करा.' });
    } catch {
      setState({ status: 'error', message: 'संदेश पाठवता आला नाही. कृपया नंतर पुन्हा प्रयत्न करा.' });
    }
  }

  const input = 'w-full border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white';
  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate={false}>
      <label className="block text-sm">तुमचे नाव *<input name="name" required maxLength={100} autoComplete="name" className={input} /></label>
      <label className="block text-sm">ईमेल *<input name="email" type="email" required maxLength={200} autoComplete="email" className={input} /></label>
      <label className="block text-sm">विषय *<input name="subject" required maxLength={150} className={input} /></label>
      <label className="block text-sm">संदेश (ऐच्छिक)<textarea name="message" rows={4} maxLength={4000} className={input} /></label>
      <div aria-hidden="true" className="hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button type="submit" disabled={state.status === 'sending'} className="bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
        {state.status === 'sending' ? 'पाठवत आहे…' : 'पाठवा'}
      </button>
      {state.message && <p role="status" className={state.status === 'ok' ? 'text-sm text-green-400' : 'text-sm text-red-300'}>{state.message}</p>}
    </form>
  );
}
