'use client';
import { useEffect, useRef, useState } from 'react';

type Fields = Partial<Record<'name' | 'email' | 'subject' | 'message', string>>;
type State = { status: 'idle' | 'sending' | 'ok' | 'error'; message?: string; fields?: Fields };

const input = 'mt-1 w-full border border-white/30 bg-neutral-800 px-3 py-2 text-base text-white placeholder:text-neutral-400 aria-[invalid=true]:border-red-400';

// Replaces Contact Form 7 (form id 7): name*, email*, subject*, message (optional). Spam control: hidden honeypot,
// render-time stamp (bots submit instantly), and server-side validation + rate limiting in /api/contact.
export function ContactForm() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const startedAt = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState({ status: 'sending' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), startedAt: startedAt.current }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setState({ status: 'ok', message: 'धन्यवाद! तुमचा संदेश पाठवला गेला आहे.' });
        form.reset();
        startedAt.current = Date.now();
        return;
      }
      const fields: Fields = json.fields ?? {};
      setState({ status: 'error', message: json.error || 'संदेश पाठवता आला नाही. कृपया नंतर पुन्हा प्रयत्न करा.', fields });
      const first = (['name', 'email', 'subject', 'message'] as const).find((k) => fields[k]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    } catch {
      setState({ status: 'error', message: 'संदेश पाठवता आला नाही. इंटरनेट जोडणी तपासून पुन्हा प्रयत्न करा.' });
    }
  }

  const err = (k: keyof Fields) => state.fields?.[k];
  const aria = (k: keyof Fields) => ({ 'aria-invalid': err(k) ? true : undefined, 'aria-describedby': err(k) ? `contact-${k}-error` : undefined });
  const fieldError = (k: keyof Fields) => err(k) && <span id={`contact-${k}-error`} className="mt-1 block text-sm text-red-300">{err(k)}</span>;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3" aria-label="संपर्क फॉर्म">
      <label className="block text-[0.95rem]">तुमचे नाव *
        <input name="name" required maxLength={100} autoComplete="name" className={input} {...aria('name')} />
        {fieldError('name')}
      </label>
      <label className="block text-[0.95rem]">ईमेल *
        <input name="email" type="email" required maxLength={200} autoComplete="email" className={input} {...aria('email')} />
        {fieldError('email')}
      </label>
      <label className="block text-[0.95rem]">विषय *
        <input name="subject" required maxLength={150} className={input} {...aria('subject')} />
        {fieldError('subject')}
      </label>
      <label className="block text-[0.95rem]">संदेश (ऐच्छिक)
        <textarea name="message" rows={4} maxLength={4000} className={input} {...aria('message')} />
        {fieldError('message')}
      </label>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button type="submit" disabled={state.status === 'sending'} className="bg-primary px-5 py-2.5 text-[0.95rem] font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
        {state.status === 'sending' ? 'पाठवत आहे…' : 'पाठवा'}
      </button>
      {/* Always mounted so screen readers announce the text when it changes */}
      <p role={state.status === 'error' ? 'alert' : 'status'} aria-live={state.status === 'error' ? 'assertive' : 'polite'} className={`min-h-6 text-[0.95rem] ${state.status === 'ok' ? 'text-green-400' : 'text-red-300'}`}>
        {state.message}
      </p>
    </form>
  );
}
