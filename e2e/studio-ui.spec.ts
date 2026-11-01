// Full editor workflow in the REAL Studio UI against mkiaioc7/production (opt-in; leaves no content behind).
//
// Authentication (pick one):
//   A. Real Google login (this is the one that proves the login works). Run once, on a machine with a display:
//        npm run studio:login            # opens Chrome, you sign in with Google, session saved to .auth/studio.json
//        STUDIO_STORAGE_STATE=.auth/studio.json npm run test:studio
//   B. Token injection (automation only; does NOT prove Google login):
//        STUDIO_TOKEN=<user token> npm run test:studio
// Both need an API credential to assert results and clean up: SANITY_API_WRITE_TOKEN, or SANITY_USE_CLI_AUTH=1
// (uses the `sanity login` session). Target: E2E_BASE_URL (default: the Vercel preview). For a protected
// preview also set STUDIO_VERCEL_BYPASS (Deployment Protection "Protection Bypass for Automation" secret).
//
// What it touches: only documents it creates (a post, a category, a tag, two images). The one existing article it
// opens gets an unsaved-to-site draft that the test discards again. Everything is removed in `finally`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createClient } from '@sanity/client';
import { expect, test, type Page } from '@playwright/test';
import { makePng } from './png';

const PROJECT = 'mkiaioc7';
const DATASET = 'production';
const BASE = process.env.E2E_BASE_URL ?? 'https://online24taas-preview.vercel.app';
const STATE = process.env.STUDIO_STORAGE_STATE;
const STUDIO_TOKEN = process.env.STUDIO_TOKEN;
const BYPASS = process.env.STUDIO_VERCEL_BYPASS;

function apiToken(): string | undefined {
  if (process.env.SANITY_API_WRITE_TOKEN) return process.env.SANITY_API_WRITE_TOKEN;
  if (process.env.SANITY_USE_CLI_AUTH) return JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/sanity/config.json'), 'utf8')).authToken;
  return STUDIO_TOKEN;
}

test.describe('Sanity Studio editor workflow (real UI, production dataset)', () => {
  test.skip(!STATE && !STUDIO_TOKEN, 'set STUDIO_STORAGE_STATE (real login) or STUDIO_TOKEN');
  test.setTimeout(900_000);
  test.use({
    baseURL: BASE,
    viewport: { width: 1440, height: 1000 },
    storageState: STATE && fs.existsSync(STATE) ? STATE : undefined,
    extraHTTPHeaders: BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : undefined,
  });

  test('login, create/draft/publish Marathi post, upload images, alt/caption, categories/tags, edit, site reflects changes', async ({ page, context }) => {
    const client = createClient({ projectId: PROJECT, dataset: DATASET, apiVersion: '2025-02-19', token: apiToken(), useCdn: false, perspective: 'raw' });
    const stamp = Date.now();
    const title = `चाचणी लेख ${stamp}`;
    const catTitle = `चाचणी विभाग ${stamp}`;
    const tagTitle = `चाचणी टॅग ${stamp}`;
    const startedAt = new Date(Date.now() - 60_000).toISOString();
    const created: string[] = [];
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    if (!STATE && STUDIO_TOKEN) {
      await context.addInitScript(([pid, tok]) => {
        localStorage.setItem(`__studio_auth_token_${pid}`, JSON.stringify({ token: tok, time: new Date().toISOString() }));
      }, [PROJECT, STUDIO_TOKEN]);
    }
    if (BYPASS) await page.goto(`/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${BYPASS}`);

    const fixtures = path.join(os.tmpdir(), `studio-ui-${stamp}`);
    fs.mkdirSync(fixtures, { recursive: true });
    const featuredPng = path.join(fixtures, 'featured.png');
    const bodyPng = path.join(fixtures, 'inline.png');
    fs.writeFileSync(featuredPng, makePng(200, 120, stamp % 251));
    fs.writeFileSync(bodyPng, makePng(180, 90, (stamp + 97) % 251));

    const existing = (await client.fetch<string[]>('*[_type=="post"][0...1]._id'))[0]; // sanity check API access
    expect(existing, 'API credential must be able to read the dataset').toBeTruthy();
    const draftOfRealArticle = 'drafts.post-929';
    const hadDraftBefore = (await client.fetch<number>('count(*[_id==$id])', { id: draftOfRealArticle })) > 0;

    const site = (p: string) => context.request.get(BASE + p, { maxRedirects: 0 });
    const dismissNotices = async () => {
      for (const name of ['Got it', 'Dismiss']) await page.getByRole('button', { name, exact: true }).click({ timeout: 1500 }).catch(() => undefined);
    };
    const waitDoc = async (id: string, pred: (d: any) => boolean, timeout = 60_000) => // eslint-disable-line @typescript-eslint/no-explicit-any
      expect.poll(async () => pred(await client.getDocument(id)), { timeout }).toBe(true);
    const findIds = (type: string, t: string) => client.fetch<string[]>('*[_type==$type && title==$t]._id', { type, t });

    try {
      // ---------------------------------------------------------------- 1. Studio opens for the signed-in user
      await openStudio(page, '/studio/structure/post', 'text="Posts"');
      await expect(page.getByText(/log in|sign in|choose login provider/i)).toHaveCount(0);
      const me = (await (await fetch('https://api.sanity.io/v2021-06-07/users/me', { headers: { Authorization: `Bearer ${apiToken()}` } })).json()) as { name?: string; email?: string };
      expect(me.name, 'API credential identifies a user').toBeTruthy();
      await expect(page.getByRole('button', { name: me.name! })).toBeVisible(); // the Studio navbar shows the signed-in user
      await page.screenshot({ path: 'test-results/studio-01-open.png' });

      // ---------------------------------------------------------------- 2. category + tag created through the UI
      await openStudio(page, '/studio/intent/create/template=category;type=category/');
      await page.locator('[data-testid="field-title"] input').fill(catTitle);
      await page.locator('[data-testid="field-slug"] button', { hasText: /generate/i }).click();
      await expect(page.locator('[data-testid="field-slug"] input')).toHaveValue(/[\u0900-\u097F]/);
      await expect.poll(async () => (await findIds('category', catTitle)).length, { timeout: 60_000 }).toBeGreaterThan(0);
      const catDraftId = (await findIds('category', catTitle))[0];
      created.push(catDraftId.replace('drafts.', ''));
      const titleOf = async (id: string) => (await client.getDocument(id))?.title as string | undefined;
      await publish(page, async () => (await titleOf(created[0])) === catTitle);
      // edit the category (rename) and re-publish
      const catRenamed = `${catTitle} (संपादित)`;
      await page.locator('[data-testid="field-title"] input').fill(catRenamed);
      await publish(page, async () => (await titleOf(created[0])) === catRenamed);

      await openStudio(page, '/studio/intent/create/template=tag;type=tag/');
      await page.locator('[data-testid="field-title"] input').fill(tagTitle);
      await page.locator('[data-testid="field-slug"] button', { hasText: /generate/i }).click();
      await expect.poll(async () => (await findIds('tag', tagTitle)).length, { timeout: 60_000 }).toBeGreaterThan(0);
      const tagId = (await findIds('tag', tagTitle))[0].replace('drafts.', '');
      created.push(tagId);
      await publish(page, async () => (await titleOf(tagId)) === tagTitle);
      const catId = created[0];

      // ---------------------------------------------------------------- 3. new Marathi post: draft first
      await openStudio(page, '/studio/intent/create/template=post;type=post/');
      const titleInput = page.locator('[data-testid="field-title"] input');
      await expect(titleInput).toBeVisible({ timeout: 60_000 });
      await titleInput.fill(title);
      await page.locator('[data-testid="field-slug"] button', { hasText: /generate/i }).click();
      await expect(page.locator('[data-testid="field-slug"] input')).toHaveValue(/[\u0900-\u097F]/);
      const slug = await page.locator('[data-testid="field-slug"] input').inputValue();

      await expect.poll(async () => (await findIds('post', title)).length, { timeout: 60_000 }).toBeGreaterThan(0);
      const postDraftId = (await findIds('post', title))[0];
      const postId = postDraftId.replace('drafts.', '');
      created.push(postId);
      expect(postDraftId.startsWith('drafts.')).toBe(true);

      await page.locator('[data-testid="field-excerpt"] textarea').fill('ही चाचणीसाठी तयार केलेली लेखाची थोडक्यात माहिती आहे.');
      const editor = page.locator('[data-testid="field-body"] [contenteditable="true"]').first();
      await editor.scrollIntoViewIfNeeded();
      await editor.click();
      await editor.pressSequentially('हा एक चाचणी परिच्छेद आहे. ', { delay: 15 });
      await page.keyboard.press('Control+b');
      await editor.pressSequentially('ठळक मजकूर', { delay: 15 });
      await page.keyboard.press('Control+b');
      await expect(editor).toContainText('ठळक मजकूर');

      // draft must be private: not on the website
      await waitDoc(postDraftId, (d) => JSON.stringify(d?.body ?? '').includes('ठळक मजकूर'));
      expect((await site(`/blog/${encodeURIComponent(slug)}`)).status(), 'draft must not be public').toBe(404);

      // ---------------------------------------------------------------- 4. featured image upload via the UI + alt/caption
      const alt = `चाचणी चित्र ${stamp}`;
      const caption = `चित्र ओळ ${stamp}`;
      await page.locator('[data-testid="field-featuredImage.alt"]').scrollIntoViewIfNeeded();
      await page.locator('input[type="file"]').first().setInputFiles(featuredPng);
      await waitDoc(postDraftId, (d) => !!d?.featuredImage?.asset?._ref, 90_000);
      await page.locator('[data-testid="field-featuredImage.alt"] input').fill(alt);
      await page.locator('[data-testid="field-featuredImage.caption"] input').fill(caption);
      await waitDoc(postDraftId, (d) => d?.featuredImage?.alt === alt && d?.featuredImage?.caption === caption);
      await page.screenshot({ path: 'test-results/studio-02-featured.png' });

      // ---------------------------------------------------------------- 5. inline body image (upload through the editor)
      await editor.scrollIntoViewIfNeeded();
      await editor.click();
      await page.keyboard.press('Control+End');
      await page.keyboard.press('Enter');
      await page.getByRole('button', { name: /^insert/i }).first().click();
      // Depending on the Studio version the toolbar button opens the image dialog directly or shows a menu first.
      await page.getByRole('menuitem', { name: /image/i }).first().click({ timeout: 4000 }).catch(() => undefined);
      const imageDialog = page.getByRole('dialog').last();
      await expect(imageDialog).toBeVisible();
      await page.locator('input[type="file"]').last().setInputFiles(bodyPng); // the dialog's input is the last one in the DOM (portal)
      await waitDoc(postDraftId, (d) => (d?.body ?? []).some((b: any) => b._type === 'image' && b.asset?._ref), 90_000); // eslint-disable-line @typescript-eslint/no-explicit-any
      const bodyAlt = `मजकुरातील चित्र ${stamp}`;
      await imageDialog.locator('[data-testid$="alt"] input').first().fill(bodyAlt);
      await page.keyboard.press('Escape');
      await waitDoc(postDraftId, (d) => (d?.body ?? []).some((b: any) => b._type === 'image' && b.alt === bodyAlt)); // eslint-disable-line @typescript-eslint/no-explicit-any
      await page.screenshot({ path: 'test-results/studio-03-body-image.png' });

      // ---------------------------------------------------------------- 6. category + tag references
      await addReference(page, 'categories', catRenamed);
      await addReference(page, 'tags', tagTitle);
      await waitDoc(postDraftId, (d) => d?.categories?.[0]?._ref === catId && d?.tags?.[0]?._ref === tagId);

      // ---------------------------------------------------------------- 7. publish; the site must show it
      await publish(page, async () => (await titleOf(postId)) === title);
      await waitDoc(postId, (d) => !!d?.featuredImage?.asset?._ref);
      expect(await client.getDocument(postDraftId), 'draft is gone after publishing').toBeFalsy();
      await expect.poll(async () => (await site(`/blog/${encodeURIComponent(slug)}`)).status(), { timeout: 90_000, message: 'published post appears on the site' }).toBe(200);
      const html = await (await site(`/blog/${encodeURIComponent(slug)}`)).text();
      expect(html).toContain(title);
      expect(html).toContain('ठळक मजकूर');
      expect(html).toContain(catRenamed);
      expect(html).toContain(alt);
      expect(html).toContain(bodyAlt);
      expect(html).toContain(tagTitle);
      await expect.poll(async () => (await (await site('/')).text()).includes(title), { timeout: 60_000, message: 'post on home page' }).toBe(true);
      const catSlug = (await client.getDocument(catId))!.slug.current as string;
      await expect.poll(async () => (await (await site(`/category/${encodeURIComponent(catSlug)}`)).text()).includes(title), { timeout: 60_000, message: 'post in category archive' }).toBe(true);

      // ---------------------------------------------------------------- 8. edit the published post, publish, site updates
      await openStudio(page, `/studio/structure/post;${postId}`);
      const edited = `${title} (संपादित)`;
      await page.locator('[data-testid="field-title"] input').fill(edited);
      await waitDoc(postDraftId, (d) => d?.title === edited);
      expect((await client.getDocument(postId))!.title, 'published stays unchanged until publish').toBe(title);
      await publish(page, async () => (await titleOf(postId)) === edited);
      await expect.poll(async () => (await (await site(`/blog/${encodeURIComponent(slug)}`)).text()).includes(edited), { timeout: 90_000, message: 'edit visible on site' }).toBe(true);

      // ---------------------------------------------------------------- 9. edit an EXISTING migrated article, then discard
      test.skip(hadDraftBefore, 'drafts.post-929 already exists; not touching it');
      const before = await client.getDocument('post-929');
      expect(before, 'migrated post-929 exists').toBeTruthy();
      await openStudio(page, '/studio/structure/post;post-929');
      await page.locator('[data-testid="field-title"] input').fill(`${before!.title} ✎`);
      await waitDoc(draftOfRealArticle, (d) => d?.title === `${before!.title} ✎`);
      expect((await client.getDocument('post-929'))!.title).toBe(before!.title);
      // document actions menu (the "…" next to Publish), then confirm the discard
      await page.locator('[data-testid="action-menu-button"]').last().click();
      await page.getByRole('menuitem', { name: /discard changes/i }).click();
      await page.getByRole('button', { name: 'Confirm', exact: true }).click();
      await waitDoc(draftOfRealArticle, (d) => d === null || d === undefined, 30_000);
      expect((await client.getDocument('post-929'))!.title, 'migrated article untouched').toBe(before!.title);
    } catch (e) {
      await page.screenshot({ path: 'test-results/studio-failure.png' }).catch(() => undefined);
      throw e;
    } finally {
      // ---------------------------------------------------------------- cleanup: everything this test created
      await page.close().catch(() => undefined); // stop Studio autosave before deleting
      const tx = client.transaction();
      for (const id of created) tx.delete(id).delete(`drafts.${id}`);
      await tx.commit().catch(() => undefined);
      if (!hadDraftBefore) await client.delete(draftOfRealArticle).catch(() => undefined);
      const stray = await client.fetch<string[]>('*[_type=="sanity.imageAsset" && _createdAt >= $s && count(*[references(^._id)]) == 0]._id', { s: startedAt }).catch(() => []);
      for (const id of stray) await client.delete(id).catch(() => undefined);
      fs.rmSync(fixtures, { recursive: true, force: true });
    }
    expect(pageErrors.filter((m) => !/ResizeObserver/.test(m))).toEqual([]);
  });
});

/** Opens a Studio URL and waits for a field; Studio's realtime connection occasionally hangs on "Still loading…", so reload once. */
async function openStudio(page: Page, url: string, ready = '[data-testid="field-title"] input') {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(url, { timeout: 120_000 });
    await page.getByRole('button', { name: 'Got it', exact: true }).click({ timeout: 1500 }).catch(() => undefined);
    const ok = await page.locator(ready).first().waitFor({ state: 'visible', timeout: 45_000 }).then(() => true, () => false);
    if (ok) return;
  }
  throw new Error(`Studio did not become ready at ${url}`);
}

/** Clicks Publish until the published document really has the expected title (a click during autosave can be ignored). */
async function publish(page: Page, isPublished: () => Promise<boolean>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const btn = page.getByRole('button', { name: 'Publish', exact: true });
    await expect(btn).toBeEnabled({ timeout: 30_000 });
    await page.waitForTimeout(2500); // let the last autosave settle
    await btn.click();
    const ok = await expect.poll(isPublished, { timeout: 15_000 }).toBe(true).then(() => true, () => false);
    if (ok) return;
  }
  throw new Error('Publish did not take effect');
}

async function addReference(page: Page, field: 'categories' | 'tags', label: string) {
  const f = page.locator(`[data-testid="field-${field}"]`);
  await f.scrollIntoViewIfNeeded();
  await f.getByRole('button', { name: /add item/i }).click();
  const search = page.getByRole('combobox').last();
  await search.fill(label.slice(0, 12));
  await page.getByRole('option').filter({ hasText: label }).first().click();
  await expect(f.getByText(label.split(' ').slice(0, 2).join(' ')).first()).toBeVisible({ timeout: 30_000 });
}
