import { NextResponse } from 'next/server';
import { LIMITS, RateLimiter, getContactConfig, sendContact, validateContact } from '@/lib/contact';

// Contact Form 7 replacement. Environment (server only):
//   SMTP_URL      e.g. smtps://user:pass@smtp.example.com:465
//   CONTACT_TO    mailbox that receives messages
//   CONTACT_FROM  sender address the SMTP account is allowed to use (defaults to CONTACT_TO)
// Without SMTP_URL and CONTACT_TO the endpoint answers 503 rather than pretending to send.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Per server instance (see RateLimiter). Add a Vercel Firewall rate-limit rule for /api/contact for a hard limit.
const perIp = new RateLimiter(5, 10 * 60_000);
const global = new RateLimiter(100, 60 * 60_000);

const json = (body: Record<string, unknown>, status: number, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

export async function POST(req: Request) {
  // Browsers always send Origin on cross-site POSTs: reject anything not coming from this site.
  const origin = req.headers.get('origin');
  if (origin) {
    let ok = false;
    try {
      ok = new URL(origin).host === (req.headers.get('x-forwarded-host') ?? req.headers.get('host'));
    } catch {}
    if (!ok) return json({ error: 'अवैध विनंती.' }, 403);
  }
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json({ error: 'अवैध विनंती.' }, 415);

  const raw = await req.text();
  if (raw.length > LIMITS.maxBodyBytes) return json({ error: 'संदेश खूप मोठा आहे.' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'अवैध विनंती.' }, 400);
  }

  const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const lim = perIp.check(ip);
  if (!lim.allowed || !global.check('all').allowed) {
    return json({ error: 'खूप जास्त प्रयत्न झाले आहेत. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.' }, 429, { 'Retry-After': String(lim.retryAfterSec || 600) });
  }

  const v = validateContact(body);
  if (!v.ok && v.reason === 'spam') return json({ ok: true }, 200); // bots get no signal
  if (!v.ok) return json({ error: 'कृपया चिन्हांकित माहिती तपासा.', fields: v.fields }, 422);

  const cfg = getContactConfig(process.env);
  if (!cfg) return json({ error: 'संदेश सेवा सध्या उपलब्ध नाही. कृपया ईमेलने संपर्क साधा.' }, 503);
  try {
    await sendContact(v.data, cfg, { ip });
    return json({ ok: true }, 200);
  } catch (e) {
    console.error('contact: send failed', e instanceof Error ? e.message : 'unknown error'); // never log the message body / credentials
    return json({ error: 'संदेश पाठवता आला नाही. कृपया नंतर पुन्हा प्रयत्न करा.' }, 502);
  }
}
