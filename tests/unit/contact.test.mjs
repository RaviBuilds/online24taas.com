import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { validateContact, RateLimiter, getContactConfig, sendContact, LIMITS } from '../../src/lib/contact.ts';

const NOW = 1_800_000_000_000;
const good = (over = {}) => ({ name: 'रवी', email: 'ravi@example.com', subject: 'नमस्कार', message: 'Hello', website: '', startedAt: NOW - 10_000, ...over });

test('accepts a valid Marathi message', () => {
  const v = validateContact(good(), NOW);
  assert.equal(v.ok, true);
  assert.equal(v.data.name, 'रवी');
});

test('honeypot, missing or instant timestamps are treated as spam', () => {
  assert.deepEqual(validateContact(good({ website: 'http://spam' }), NOW), { ok: false, reason: 'spam' });
  assert.equal(validateContact(good({ startedAt: undefined }), NOW).reason, 'spam');
  assert.equal(validateContact(good({ startedAt: NOW - 500 }), NOW).reason, 'spam');
  assert.equal(validateContact(good({ startedAt: NOW - LIMITS.maxAgeMs - 1 }), NOW).reason, 'spam');
  assert.equal(validateContact(null, NOW).reason, 'spam');
});

test('reports each invalid field', () => {
  const v = validateContact(good({ name: ' ', email: 'not-an-email', subject: '' }), NOW);
  assert.equal(v.ok, false);
  assert.deepEqual(Object.keys(v.fields).sort(), ['email', 'name', 'subject']);
});

test('rejects link-stuffed messages', () => {
  const v = validateContact(good({ message: 'http://a.com http://b.com https://c.com' }), NOW);
  assert.deepEqual(Object.keys(v.fields), ['message']);
});

test('header injection: CR/LF in single-line fields is flattened', () => {
  const v = validateContact(good({ subject: 'Hi\r\nBcc: victim@example.com', name: 'A\nB' }), NOW);
  assert.equal(v.ok, true);
  assert.ok(!/[\r\n]/.test(v.data.subject) && !/[\r\n]/.test(v.data.name));
  assert.equal(validateContact(good({ email: 'a@b.com\r\nBcc: x@y.com' }), NOW).ok, false);
});

test('lengths are capped', () => {
  const v = validateContact(good({ name: 'x'.repeat(500), message: 'y'.repeat(9000) }), NOW);
  assert.equal(v.data.name.length, LIMITS.name);
  assert.equal(v.data.message.length, LIMITS.message);
});

test('rate limiter: blocks after the limit and recovers after the window', () => {
  const rl = new RateLimiter(3, 1000);
  for (let i = 0; i < 3; i++) assert.equal(rl.check('ip', 0).allowed, true);
  const blocked = rl.check('ip', 10);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.equal(rl.check('other', 10).allowed, true);
  assert.equal(rl.check('ip', 1001).allowed, true);
});

test('config requires SMTP_URL and CONTACT_TO; CONTACT_FROM defaults to CONTACT_TO', () => {
  assert.equal(getContactConfig({}), null);
  assert.equal(getContactConfig({ SMTP_URL: 'smtp://x', CONTACT_TO: '' }), null);
  assert.deepEqual(getContactConfig({ SMTP_URL: 'smtp://x', CONTACT_TO: 'a@b.com' }), { smtpUrl: 'smtp://x', to: 'a@b.com', from: 'a@b.com' });
  assert.equal(getContactConfig({ SMTP_URL: 'smtp://x', CONTACT_TO: 'a@b.com', CONTACT_FROM: 'noreply@b.com' }).from, 'noreply@b.com');
});

// Minimal SMTP sink so delivery is tested end-to-end without an external mail account.
function smtpSink() {
  const received = [];
  const server = net.createServer((sock) => {
    let data = '', inData = false, buf = '';
    const send = (s) => sock.write(s + '\r\n');
    send('220 sink ESMTP');
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (inData) {
          if (line === '.') { inData = false; received.push(data); data = ''; send('250 queued'); } else data += line + '\n';
        } else if (/^EHLO/i.test(line)) send('250 sink');
        else if (/^(MAIL|RCPT)/i.test(line)) send('250 ok');
        else if (/^DATA/i.test(line)) { inData = true; send('354 go'); }
        else if (/^QUIT/i.test(line)) { send('221 bye'); sock.end(); }
        else send('250 ok');
      }
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, received, port: server.address().port })));
}

test('sendContact delivers a UTF-8 message with Reply-To to the SMTP server', async () => {
  const { server, received, port } = await smtpSink();
  try {
    const v = validateContact(good({ message: 'मराठी संदेश\nदुसरी ओळ' }), NOW);
    await sendContact(v.data, { smtpUrl: `smtp://127.0.0.1:${port}?ignoreTLS=true`, to: 'owner@example.com', from: 'site@example.com' });
    assert.equal(received.length, 1);
    const raw = received[0];
    assert.match(raw, /^To: owner@example.com/m);
    assert.match(raw, /^From: site@example.com/m);
    assert.match(raw, /^Reply-To: .*<ravi@example.com>/m);
    assert.match(raw, /^Subject: /m);
  } finally {
    server.close();
  }
});

test('sendContact rejects when the SMTP server is unreachable', async () => {
  await assert.rejects(sendContact({ name: 'a', email: 'a@b.co', subject: 's', message: 'm' }, { smtpUrl: 'smtp://127.0.0.1:1', to: 'o@example.com', from: 'o@example.com' }));
});
