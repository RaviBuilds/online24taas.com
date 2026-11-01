// Boots the already-built app (`npm run build` first) with TEST secrets and a local SMTP sink, then exercises the
// revalidate webhook, contact delivery and ads.txt over real HTTP. Nothing here touches Sanity writes or real mail.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { slugTag } from '../../src/lib/cache-tags.ts';

const PORT = 3190 + Math.floor(Math.random() * 9);
const BASE = `http://127.0.0.1:${PORT}`;
const SECRET = randomBytes(24).toString('hex');
const received = [];
let smtp, app;

function startSink() {
  return new Promise((resolve) => {
    smtp = net.createServer((sock) => {
      let inData = false, data = '', buf = '';
      sock.write('220 sink\r\n');
      sock.on('data', (c) => {
        buf += c.toString('utf8');
        let i;
        while ((i = buf.indexOf('\r\n')) >= 0) {
          const line = buf.slice(0, i); buf = buf.slice(i + 2);
          if (inData) { if (line === '.') { inData = false; received.push(data); data = ''; sock.write('250 queued\r\n'); } else data += line + '\n'; }
          else if (/^DATA/i.test(line)) { inData = true; sock.write('354 go\r\n'); }
          else if (/^QUIT/i.test(line)) { sock.write('221 bye\r\n'); sock.end(); }
          else sock.write('250 ok\r\n');
        }
      });
    });
    smtp.listen(0, '127.0.0.1', () => resolve(smtp.address().port));
  });
}

before(async () => {
  const smtpPort = await startSink();
  app = spawn('node_modules/.bin/next', ['start', '-p', String(PORT), '-H', '127.0.0.1'], {
    env: {
      ...process.env,
      SANITY_REVALIDATE_SECRET: SECRET,
      SMTP_URL: `smtp://127.0.0.1:${smtpPort}?ignoreTLS=true`,
      CONTACT_TO: 'owner@example.com',
      CONTACT_FROM: 'site@example.com',
      ADS_TXT: 'example.com, pub-0000000000000000, DIRECT, 0000000000000000\\nexample.org, 1, RESELLER',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${BASE}/robots.txt`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('server did not start');
});
after(() => { app?.kill(); smtp?.close(); });

const sign = (body, t = Date.now(), secret = SECRET) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('base64url')}`;
const hook = (body, sig) => fetch(`${BASE}/api/revalidate`, { method: 'POST', body, headers: sig ? { 'sanity-webhook-signature': sig } : {} });

test('revalidate: valid signature -> 200 with the expected tags', async () => {
  const body = JSON.stringify({ _type: 'post', slug: 'abc' });
  const r = await hook(body, sign(body));
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.ok(j.revalidated.includes('posts') && j.revalidated.includes(slugTag('post', 'abc')));
  assert.ok(j.revalidated.every((t) => /^[\x20-\x7e]+$/.test(t)), 'every tag is printable ASCII (HTTP header safe)');
  // a Marathi slug must also produce an ASCII-only tag
  const body2 = JSON.stringify({ _type: 'post', slug: 'श्री-गणेश' });
  const j2 = await (await hook(body2, sign(body2))).json();
  assert.ok(j2.revalidated.every((t) => /^[\x20-\x7e]+$/.test(t)));
});
test('revalidate: missing, wrong-secret, tampered and stale signatures -> 401', async () => {
  const body = JSON.stringify({ _type: 'post', slug: 'abc' });
  assert.equal((await hook(body)).status, 401);
  assert.equal((await hook(body, sign(body, Date.now(), 'wrong'))).status, 401);
  assert.equal((await hook(body + ' ', sign(body))).status, 401);
  assert.equal((await hook(body, sign(body, Date.now() - 2 * 3600_000))).status, 401);
});
test('revalidate: GET is not allowed', async () => {
  assert.equal((await fetch(`${BASE}/api/revalidate`)).status, 405);
});

test('contact: valid message is delivered through SMTP', async () => {
  const r = await fetch(`${BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-real-ip': '203.0.113.7' },
    body: JSON.stringify({ name: 'रवी', email: 'reader@example.com', subject: 'चाचणी', message: 'नमस्कार', startedAt: Date.now() - 10_000 }),
  });
  assert.equal(r.status, 200);
  assert.equal(received.length, 1);
  assert.match(received[0], /^To: owner@example.com/m);
  assert.match(received[0], /^Reply-To: .*reader@example.com/m);
});
test('contact: honeypot returns 200 but sends nothing; invalid input -> 422; rate limit -> 429', async () => {
  const post = (b, ip) => fetch(`${BASE}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-real-ip': ip }, body: JSON.stringify(b) });
  const before = received.length;
  assert.equal((await post({ name: 'a', email: 'a@b.co', subject: 's', website: 'x', startedAt: Date.now() - 10_000 }, '203.0.113.20')).status, 200);
  assert.equal(received.length, before);
  assert.equal((await post({ name: '', email: 'x', subject: '', startedAt: Date.now() - 10_000 }, '203.0.113.21')).status, 422);
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await post({ name: '', email: 'x', subject: '', startedAt: Date.now() - 10_000 }, '203.0.113.22')).status);
  assert.deepEqual(codes.slice(0, 5), [422, 422, 422, 422, 422]);
  assert.equal(codes[6], 429);
});

test('ads.txt serves exactly the configured lines', async () => {
  const r = await fetch(`${BASE}/ads.txt`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/plain/);
  assert.equal(await r.text(), 'example.com, pub-0000000000000000, DIRECT, 0000000000000000\nexample.org, 1, RESELLER\n');
});

test('AdSense script is absent outside the production deployment', async () => {
  const html = await (await fetch(`${BASE}/`)).text();
  assert.ok(!html.includes('pagead2.googlesyndication.com'));
});
