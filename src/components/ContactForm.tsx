'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

type Fields = Partial<Record<'name' | 'email' | 'subject' | 'message', string>>;
type State = { status: 'idle' | 'sending' | 'ok' | 'error'; message?: string; fields?: Fields };

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
  const fieldError = (k: keyof Fields) => err(k) && <span id={`contact-${k}-error`} className="mt-1 block text-sm font-medium text-[#ffb4b4]">{err(k)}</span>;
  const label = 'block text-[0.9375rem] font-semibold text-white/90';

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4" aria-label="संपर्क फॉर्म" noValidate={false}>
      <label className={label}>तुमचे नाव <span aria-hidden className="text-saffron">*</span>
        <input name="name" required maxLength={100} autoComplete="name" className="field" {...aria('name')} />
        {fieldError('name')}
      </label>
      <label className={label}>ईमेल <span aria-hidden className="text-saffron">*</span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" inputMode="email" className="field" {...aria('email')} />
        {fieldError('email')}
      </label>
      <label className={label}>विषय <span aria-hidden className="text-saffron">*</span>
        <input name="subject" required maxLength={150} className="field" {...aria('subject')} />
        {fieldError('subject')}
      </label>
      <label className={label}>संदेश <span className="font-normal text-white/60">(ऐच्छिक)</span>
        <textarea name="message" rows={4} maxLength={4000} className="field resize-y" {...aria('message')} />
        {fieldError('message')}
      </label>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button type="submit" disabled={state.status === 'sending'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-saffron px-7 font-extrabold text-ink transition-[background-color,scale] duration-150 hover:bg-white active:scale-[0.98] disabled:opacity-60">
        {state.status === 'sending' ? 'पाठवत आहे…' : <>पाठवा <Icon name="arrowRight" className="size-4" /></>}
      </button>
      {/* Always mounted so screen readers announce the text when it changes */}
      <p
        role={state.status === 'error' ? 'alert' : 'status'}
        aria-live={state.status === 'error' ? 'assertive' : 'polite'}
        className={`min-h-6 text-[0.9375rem] font-semibold ${state.status === 'ok' ? 'flex items-center gap-2 rounded-xl bg-[#1f6b3a]/40 px-3 py-2 text-[#c9f2d6]' : state.status === 'error' ? 'rounded-xl bg-[#a80f18]/40 px-3 py-2 text-[#ffd3d3]' : ''}`}
      >
        {state.status === 'ok' && <Icon name="check" className="size-5 shrink-0" />}
        {state.message}
      </p>
    </form>
  );
}
