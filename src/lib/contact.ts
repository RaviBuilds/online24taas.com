// Contact form logic, kept free of Next.js imports so it can be unit-tested (tests/unit/contact.test.mjs).
// Replaces Contact Form 7 (form id 7: name*, email*, subject*, message).
import nodemailer from 'nodemailer';

export interface ContactData { name: string; email: string; subject: string; message: string }
export type FieldName = 'name' | 'email' | 'subject' | 'message';
export type Validation =
  | { ok: true; data: ContactData }
  | { ok: false; reason: 'spam' }
  | { ok: false; reason: 'invalid'; fields: Partial<Record<FieldName, string>> };

export const LIMITS = { name: 100, email: 200, subject: 150, message: 4000, maxLinks: 2, minFillMs: 2500, maxAgeMs: 24 * 3600_000, maxBodyBytes: 16 * 1024 };

const EMAIL = /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/;
const LINK = /(https?:\/\/|www\.)/gi;
// One line only: strip CR/LF/control characters so a value can never inject a mail header.
const oneLine = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim().slice(0, max);

export const MESSAGES = {
  name: 'कृपया तुमचे नाव लिहा.',
  email: 'कृपया योग्य ईमेल पत्ता लिहा.',
  subject: 'कृपया विषय लिहा.',
  message: 'संदेशात दोनपेक्षा जास्त लिंक चालणार नाहीत.',
} as const;

/** Server-side validation + spam checks. `now` is injectable for tests. */
export function validateContact(body: unknown, now = Date.now()): Validation {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  // Honeypot: real users never see or fill this field.
  if (oneLine(b.website, 50)) return { ok: false, reason: 'spam' };
  // Time trap: the form records when it was rendered; bots submit instantly (or omit it).
  const startedAt = Number(b.startedAt);
  if (!Number.isFinite(startedAt) || now - startedAt < LIMITS.minFillMs || now - startedAt > LIMITS.maxAgeMs) return { ok: false, reason: 'spam' };

  const data: ContactData = {
    name: oneLine(b.name, LIMITS.name),
    email: oneLine(b.email, LIMITS.email),
    subject: oneLine(b.subject, LIMITS.subject),
    message: String(b.message ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, LIMITS.message),
  };
  const fields: Partial<Record<FieldName, string>> = {};
  if (!data.name) fields.name = MESSAGES.name;
  if (!EMAIL.test(data.email)) fields.email = MESSAGES.email;
  if (!data.subject) fields.subject = MESSAGES.subject;
  if ((data.message.match(LINK) ?? []).length > LIMITS.maxLinks) fields.message = MESSAGES.message;
  return Object.keys(fields).length ? { ok: false, reason: 'invalid', fields } : { ok: true, data };
}

/** Fixed-window limiter. In-memory, so it is per server instance: a best-effort brake, not a global quota. */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  private limit: number;
  private windowMs: number;
  private maxKeys: number;
  constructor(limit: number, windowMs: number, maxKeys = 5000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.maxKeys = maxKeys;
  }
  check(key: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
    if (this.hits.size > this.maxKeys) for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    const cur = this.hits.get(key);
    if (!cur || cur.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSec: 0 };
    }
    if (cur.count >= this.limit) return { allowed: false, retryAfterSec: Math.ceil((cur.resetAt - now) / 1000) };
    cur.count++;
    return { allowed: true, retryAfterSec: 0 };
  }
}

export interface ContactConfig { smtpUrl: string; to: string; from: string }
export function getContactConfig(env: Record<string, string | undefined>): ContactConfig | null {
  const smtpUrl = env.SMTP_URL?.trim();
  const to = env.CONTACT_TO?.trim();
  if (!smtpUrl || !to) return null;
  return { smtpUrl, to, from: env.CONTACT_FROM?.trim() || to };
}

export async function sendContact(data: ContactData, cfg: ContactConfig, meta: { ip?: string } = {}) {
  const transport = nodemailer.createTransport(cfg.smtpUrl, { connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 });
  await transport.sendMail({
    to: cfg.to,
    from: cfg.from,
    replyTo: { name: data.name.replace(/["<>]/g, ''), address: data.email },
    subject: `[Online24Taas] ${data.subject}`,
    text: `From: ${data.name} <${data.email}>\nSubject: ${data.subject}\n\nMessage Body:\n${data.message}\n\n-- \nSent from the contact form on Online24Taas${meta.ip ? ` (IP ${meta.ip})` : ''}`,
  });
}
