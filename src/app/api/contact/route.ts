import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Replacement for Contact Form 7 (form 7). Delivery needs SMTP settings in the environment:
//   SMTP_URL (e.g. smtps://user:pass@smtp.example.com:465), CONTACT_TO, CONTACT_FROM
// Without them the endpoint answers 503 instead of pretending to send.
export const runtime = 'nodejs';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'अवैध विनंती.' }, { status: 400 });
  }
  if (clean(body.website, 50)) return NextResponse.json({ ok: true }); // honeypot: pretend success
  const name = clean(body.name, 100);
  const email = clean(body.email, 200);
  const subject = clean(body.subject, 150);
  const message = String(body.message ?? '').trim().slice(0, 4000);
  if (!name || !subject || !EMAIL.test(email)) return NextResponse.json({ error: 'कृपया सर्व आवश्यक माहिती योग्य भरा.' }, { status: 422 });

  const { SMTP_URL, CONTACT_TO, CONTACT_FROM } = process.env;
  if (!SMTP_URL || !CONTACT_TO) return NextResponse.json({ error: 'संदेश सेवा सध्या उपलब्ध नाही.' }, { status: 503 });
  try {
    await nodemailer.createTransport(SMTP_URL).sendMail({
      to: CONTACT_TO,
      from: CONTACT_FROM || CONTACT_TO,
      replyTo: `${name.replace(/[<>"]/g, '')} <${email}>`,
      subject: `[Online24Taas] ${subject}`,
      text: `From: ${name} <${email}>\nSubject: ${subject}\n\nMessage Body:\n${message}\n\n-- \nThis e-mail was sent from the contact form on Online24Taas`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'संदेश पाठवता आला नाही.' }, { status: 502 });
  }
}
