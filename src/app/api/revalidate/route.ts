import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { slugTag } from '@/lib/cache-tags';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Sanity webhook target (create a webhook in manage.sanity.io with the same secret, projection {_type, "slug": slug.current}).
// Authentication: HMAC signature header `sanity-webhook-signature` (see @sanity/webhook) over the raw body.
export const runtime = 'nodejs';

const MAX_AGE_MS = 60 * 60_000; // Sanity retries failed deliveries; anything older than an hour is a replay

function validSignature(raw: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header) return false;
  const m = /t=(\d+),v1=([A-Za-z0-9_-]+)/.exec(header);
  if (!m) return false;
  if (Math.abs(now - Number(m[1])) > MAX_AGE_MS) return false;
  const expected = createHmac('sha256', secret).update(`${m[1]}.${raw}`).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(m[2]);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: 'not configured' }, { status: 503 });
  const raw = await req.text();
  if (raw.length > 100_000) return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  if (!validSignature(raw, req.headers.get('sanity-webhook-signature'), secret)) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  let payload: { _type?: string; slug?: string } = {};
  try { payload = JSON.parse(raw); } catch { /* ignore */ }
  const tags = new Set(['site', 'posts', 'pages', 'taxonomy', 'media', 'redirects']);
  if (payload._type === 'post' && payload.slug) tags.add(slugTag('post', payload.slug));
  if (payload._type === 'page' && payload.slug) tags.add(slugTag('page', payload.slug));
  tags.forEach((t) => revalidateTag(t));
  return NextResponse.json({ revalidated: [...tags] });
}
