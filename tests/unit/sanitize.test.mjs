import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml } from '../../src/lib/sanitizeHtml.ts';

test('removes scripts, handlers and unsafe URLs, keeps safe markup and Marathi text', () => {
  const out = sanitizeHtml('<p>नमस्कार <strong>जग</strong></p><script>alert(1)</script><a href="javascript:alert(2)">x</a><img src="ok.jpg" onerror="alert(3)"><a href="https://ok.example/p">ठीक</a>');
  assert.match(out, /<p>नमस्कार <strong>जग<\/strong><\/p>/);
  assert.doesNotMatch(out, /script|alert\(1\)|javascript:|onerror/i);
  assert.match(out, /<a href="https:\/\/ok\.example\/p">ठीक<\/a>/);
});

test('drops data: and vbscript: URLs', () => {
  const out = sanitizeHtml('<a href="data:text/html;base64,AAAA">d</a><a href="vbscript:x">v</a><img src="data:image/png;base64,AAAA">');
  assert.doesNotMatch(out, /data:|vbscript:/);
});

test('iframes: only allow-listed hosts survive; sandbox + dimensions kept', () => {
  const ok = sanitizeHtml('<iframe src="https://ws-in.amazon-adsystem.com/widgets/q?x=1" sandbox="allow-popups" style="width:120px;height:240px;" frameborder="0"></iframe>');
  assert.match(ok, /<iframe[^>]+amazon-adsystem\.com/);
  assert.match(ok, /sandbox="allow-popups"/);
  const bad = sanitizeHtml('<iframe src="https://evil.example/x"></iframe><iframe src="javascript:alert(1)"></iframe>');
  assert.doesNotMatch(bad, /iframe/);
});

test('forms and inputs are removed', () => {
  assert.doesNotMatch(sanitizeHtml('<form action="/x"><input name="a"><button>go</button></form>'), /form|input|button/);
});

test('target=_blank links get rel=noopener noreferrer', () => {
  assert.match(sanitizeHtml('<a href="https://a.example" target="_blank">x</a>'), /rel="noopener noreferrer"/);
});

test('stray angle brackets in text are escaped', () => {
  const out = sanitizeHtml('a < b and c > d');
  assert.match(out, /&lt;/);
  assert.match(out, /&gt;/);
});
