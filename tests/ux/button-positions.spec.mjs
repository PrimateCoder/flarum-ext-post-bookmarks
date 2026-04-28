// Button positions spec — tests admin setting for bookmark button placement.

import {
  createBrowser, createPage, createTestDiscussion,
  dbWriteSetting, clearCache, apiPatchJson, apiFetch,
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
  console.log('button-positions spec');

  const discussionId = await createTestDiscussion(
    'Button Position Test ' + Date.now(),
    'Test post for button positions.',
    [],
    COOKIE
  );

  const { browser, context } = await createBrowser(COOKIE);
  const page = await createPage(context);

  try {
    // 1. Default = header
    await dbWriteSetting('post-bookmarks.buttonPosition', 'header');
    await dbWriteSetting('post-bookmarks.headerBadge', '0');
    await clearCache();
    await page.goto(`${BASE_URL}/d/${discussionId}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });
    const headerBtn = await page.$('.Post-header .item-bookmark button');
    check('Header position: button above post', !!headerBtn);

    // 2. Actions position
    await dbWriteSetting('post-bookmarks.buttonPosition', 'actions');
    await clearCache();
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });
    const actionsBtn = await page.$('.Post-actions .item-bookmark button');
    check('Actions position: button below post', !!actionsBtn);

    // 3. Menu position
    await dbWriteSetting('post-bookmarks.buttonPosition', 'menu');
    await clearCache();
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });
    const menuToggle = await page.$('.Post-controls .Dropdown-toggle');
    if (menuToggle) {
      await menuToggle.click();
      await page.waitForTimeout(500);
      const menuBookmark = await page.$('.Dropdown-menu .item-bookmark button, .Dropdown-menu button:has(.fa-bookmark)');
      check('Menu position: button in 3-dot menu', !!menuBookmark);
    } else {
      check('Menu position: button in 3-dot menu', false, 'post menu toggle not found');
    }

    // 4. Header badge
    await dbWriteSetting('post-bookmarks.buttonPosition', 'actions');
    await dbWriteSetting('post-bookmarks.headerBadge', '1');
    await clearCache();

    const discussion = await apiFetch(`/discussions/${discussionId}`, COOKIE);
    const firstPostId = discussion.data?.relationships?.firstPost?.data?.id
      || discussion.data?.relationships?.posts?.data?.[0]?.id;
    if (firstPostId) {
      await apiPatchJson(`/posts/${firstPostId}`, {
        data: { attributes: { bookmarked: true } }
      }, COOKIE);
    }

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });
    const badge = await page.$('.BookmarkedPostLabel');
    check('Header badge visible when enabled + post bookmarked', !!badge);

    // Clean up
    if (firstPostId) {
      await apiPatchJson(`/posts/${firstPostId}`, {
        data: { attributes: { bookmarked: false } }
      }, COOKIE);
    }
    await dbWriteSetting('post-bookmarks.buttonPosition', 'header');
    await dbWriteSetting('post-bookmarks.headerBadge', '0');
    await clearCache();

    // 5. No JS errors
    check('No JS errors across all positions', page._uxErrors.length === 0,
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
