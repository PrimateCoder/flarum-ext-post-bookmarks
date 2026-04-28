// Guest behavior spec — tests that guests don't see bookmark UI.

import {
  createBrowser, createPage, createTestDiscussion,
  dbWriteSetting, clearCache,
  BASE_URL,
} from '../../.pianotell/tests/ux/helpers.mjs';

const COOKIE = process.env.PIANOTELL_FLARUM_UX_COOKIE;
if (!BASE_URL || !COOKIE) {
  console.error('PIANOTELL_FLARUM_UX_BASE_URL and PIANOTELL_FLARUM_UX_COOKIE must be set.');
  process.exit(2);
}

const failures = [];
function check(label, ok, detail) {
  if (ok) console.log(`  ✓ ${label}`);
  else { console.log(`  ✗ ${label}  ${detail ?? ''}`); failures.push({ label, detail }); }
}

(async () => {
  console.log('guest-behavior spec');

  await dbWriteSetting('post-bookmarks.buttonPosition', 'header');
  await clearCache();

  const discussionId = await createTestDiscussion(
    'Guest Test ' + Date.now(),
    'Visible to guests.',
    [],
    COOKIE
  );

  // Guest session (no cookie)
  const { browser, context } = await createBrowser(null);
  const page = await createPage(context);

  try {
    // 1. Bookmark button not visible
    await page.goto(`${BASE_URL}/d/${discussionId}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });
    const bookmarkBtn = await page.$('.item-bookmark');
    check('Bookmark button not visible to guests', !bookmarkBtn);

    // 2. Nav link not visible
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.Hero, .container', { timeout: 10_000 });
    const navLink = await page.$('a[href*="bookmarked-posts"]');
    check('"Bookmarks" nav link not visible to guests', !navLink);

    // 3. /bookmarked-posts page accessible
    const response = await page.goto(`${BASE_URL}/bookmarked-posts`, { waitUntil: 'networkidle' });
    const status = response?.status();
    check('/bookmarked-posts page accessible for guests', status === 200 || status === 304);

    // 4. No JS errors
    check('No JS errors', page._uxErrors.length === 0,
      page._uxErrors.length > 0 ? page._uxErrors.join('; ') : undefined);
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.log(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
})();
