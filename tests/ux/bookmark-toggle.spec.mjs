// Bookmark toggle spec — tests core bookmark/unbookmark interaction on posts.

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
  console.log('bookmark-toggle spec');

  // Ensure default settings
  await dbWriteSetting('post-bookmarks.buttonPosition', 'header');
  await dbWriteSetting('post-bookmarks.headerBadge', '0');
  await clearCache();

  const discussionId = await createTestDiscussion(
    'Bookmark Toggle Test ' + Date.now(),
    'Test post for bookmark toggle.',
    [],
    COOKIE
  );

  const { browser, context } = await createBrowser(COOKIE);
  const page = await createPage(context);

  try {
    await page.goto(`${BASE_URL}/d/${discussionId}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });

    // 1. Bookmark button visible (in header position)
    const bookmarkBtn = await page.$('.item-bookmark button.Button--link');
    check('Bookmark button visible on post', !!bookmarkBtn);
    if (!bookmarkBtn) return;

    // Verify it's visible
    const isVisible = await bookmarkBtn.isVisible();
    check('Bookmark button is actually visible', isVisible);
    if (!isVisible) return;

    // 2. Click to bookmark — icon should toggle to solid
    await bookmarkBtn.click();
    await page.waitForTimeout(1500);
    const hasBookmarkedClass = await page.$('.item-bookmark .Button--bookmarked');
    const hasSolidIcon = await page.$('.item-bookmark .fas.fa-bookmark');
    check('Icon toggles to solid after bookmarking', !!(hasBookmarkedClass || hasSolidIcon));

    // 3. Success alert appears
    const alert = await page.$('.AlertManager .Alert--success');
    check('Success alert appears after bookmarking', !!alert);

    // 4. "Go to bookmarks" link in alert
    const alertLink = await page.$('.AlertManager .Alert--success .Button--link');
    check('"Go to bookmarks" link in alert', !!alertLink);

    // 5. Bookmark persists after reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });
    const persisted = await page.$('.item-bookmark .Button--bookmarked, .item-bookmark .fas.fa-bookmark');
    check('Bookmark persists after reload', !!persisted);

    // 6. Unbookmark
    const unbookmarkBtn = await page.$('.item-bookmark button');
    if (unbookmarkBtn) {
      await unbookmarkBtn.click();
      await page.waitForTimeout(1500);
      const regularIcon = await page.$('.item-bookmark .far.fa-bookmark');
      check('Unbookmark toggles icon back', !!regularIcon);
    } else {
      check('Unbookmark toggles icon back', false, 'button not found');
    }

    // 7. No JS errors
    check('No JS errors on page', page._uxErrors.length === 0,
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
