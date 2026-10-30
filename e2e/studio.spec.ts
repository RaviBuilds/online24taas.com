// Authenticated editor workflow in the real Studio UI. Opt-in:
//   STUDIO_TOKEN=<Editor/Admin user token> STUDIO_PROJECT=qvtcbb1j STUDIO_DATASET=migration-test npx playwright test studio
// The token is injected into Studio's localStorage (same place the Google/GitHub login stores it) so
// no interactive OAuth is needed. The test creates ONE document, verifies it through the API and
// deletes it again; no migrated content is touched.
import { createClient } from '@sanity/client';
import { expect, test } from '@playwright/test';

const token = process.env.STUDIO_TOKEN;
const projectId = process.env.STUDIO_PROJECT ?? 'qvtcbb1j';
const dataset = process.env.STUDIO_DATASET ?? 'migration-test';

test.describe('Sanity Studio editor workflow', () => {
  test.skip(!token, 'set STUDIO_TOKEN to run the authenticated Studio test');
  test.setTimeout(180_000);

  test('create Marathi post, format, save as draft, publish, edit, unpublish-safe cleanup', async ({ page, context }) => {
    const client = createClient({ projectId, dataset, apiVersion: '2025-02-19', token, useCdn: false, perspective: 'raw' });
    const title = `चाचणी लेख ${Date.now()}`;
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => consoleErrors.push(e.message));

    await context.addInitScript(([pid, tok]) => {
      localStorage.setItem(`__studio_auth_token_${pid}`, JSON.stringify({ token: tok, time: new Date().toISOString() }));
    }, [projectId, token]);

    let createdId: string | undefined;
    try {
      await page.goto('/studio/structure/post');
      await expect(page.getByText('Posts').first()).toBeVisible({ timeout: 60_000 });
      // Posts pane "+" creates a post directly (the global "+" opens a type picker)
      await page.locator('button[data-testid="action-intent-button"], [data-testid="pane-header"] button').filter({ has: page.locator('svg') }).first().click({ trial: true }).catch(() => undefined);
      await page.goto('/studio/intent/create/template=post;type=post/');

      const titleInput = page.locator('[data-testid="field-title"] input');
      await expect(titleInput).toBeVisible({ timeout: 60_000 });
      await titleInput.fill(title);

      // Slug: generated with the Marathi-aware slugify (default Sanity slugify would erase Devanagari)
      await page.locator('[data-testid="field-slug"] button', { hasText: /generate/i }).click();
      await expect(page.locator('[data-testid="field-slug"] input')).toHaveValue(/[\u0900-\u097F]/);

      // Portable Text body: type Marathi, make a heading via style menu is UI-heavy; type text + bold via keyboard
      const editor = page.locator('[data-testid="field-body"] [contenteditable="true"]').first();
      await editor.scrollIntoViewIfNeeded();
      await editor.click();
      await editor.pressSequentially('हा एक चाचणी परिच्छेद आहे. ', { delay: 20 });
      await page.keyboard.press('Control+b');
      await editor.pressSequentially('ठळक मजकूर', { delay: 20 });
      await page.keyboard.press('Control+b');
      await expect(editor).toContainText('ठळक मजकूर');

      // draft is auto-saved by Studio
      await expect.poll(async () => (await client.fetch('*[_type=="post" && title==$t]{_id}', { t: title })).length, { timeout: 60_000 }).toBeGreaterThan(0);
      const drafts = await client.fetch<{ _id: string }[]>('*[_type=="post" && title==$t]{_id}', { t: title });
      createdId = drafts[0]._id.replace('drafts.', '');
      expect(drafts[0]._id.startsWith('drafts.')).toBe(true); // draft first: private

      // Publish
      const publish = page.getByRole('button', { name: 'Publish', exact: true });
      await expect(publish).toBeEnabled({ timeout: 30_000 });
      await page.waitForTimeout(2500); // let the last autosave settle
      await publish.click();
      await page.waitForTimeout(1500);
      if ((await client.fetch('count(*[_id==$id])', { id: createdId })) === 0) await publish.click({ force: true });
      await page.screenshot({ path: 'test-results/after-publish.png' });
      await expect.poll(async () => client.fetch('count(*[_id==$id])', { id: createdId }), { timeout: 60_000 }).toBe(1);

      const pub = await client.fetch(`*[_id==$id][0]{title, "slug": slug.current, body}`, { id: createdId });
      expect(pub.title).toBe(title);
      expect(pub.slug).toMatch(/[\u0900-\u097F]/);
      expect(JSON.stringify(pub.body)).toContain('हा एक चाचणी परिच्छेद आहे.');
      expect(JSON.stringify(pub.body)).toContain('"strong"');

      // Edit the published doc: creates a draft alongside the published one
      await titleInput.fill(title + ' (संपादित)');
      await expect.poll(async () => client.fetch('count(*[_id==$id])', { id: 'drafts.' + createdId }), { timeout: 60_000 }).toBe(1);
      expect((await client.fetch('*[_id==$id][0].title', { id: createdId }))).toBe(title); // published unchanged until re-publish
    } finally {
      if (createdId) await client.transaction().delete(createdId).delete('drafts.' + createdId).commit().catch(() => undefined);
    }
    expect(consoleErrors.filter((m) => !/ResizeObserver/.test(m))).toEqual([]);
  });
});
