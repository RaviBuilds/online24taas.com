// Opens a visible Chrome window at the Studio login page so the OWNER can sign in with Google by hand.
// The resulting browser session (cookies + localStorage) is saved to .auth/studio.json (git-ignored) and can be
// used by e2e/studio-ui.spec.ts. The password / 2FA are typed by you in the browser and never seen by this script.
//   npm run studio:login [-- https://online24taas-preview.vercel.app]
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const base = (process.argv[2] ?? process.env.E2E_BASE_URL ?? 'https://online24taas-preview.vercel.app').replace(/\/$/, '');
const bypass = process.env.STUDIO_VERCEL_BYPASS;
fs.mkdirSync('.auth', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
if (bypass) await page.goto(`${base}/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${bypass}`);
await page.goto(`${base}/studio`);
console.log(`\nA Chrome window is open at ${base}/studio.\n1. If Vercel asks you to log in, do that first.\n2. In the Studio, choose "Google" and sign in with the account that owns the Sanity project.\n3. Wait until the Studio shows the content list (Posts, Pages, ...). This script then saves the session.\n`);
await page.getByText('Posts', { exact: true }).first().waitFor({ timeout: 10 * 60_000 });
await page.waitForTimeout(2000);
await ctx.storageState({ path: '.auth/studio.json' });
console.log('Session saved to .auth/studio.json. Close the window. Next: STUDIO_STORAGE_STATE=.auth/studio.json npm run test:studio');
await browser.close();
