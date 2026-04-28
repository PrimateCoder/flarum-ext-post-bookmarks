// Bookmarks page spec — tests the /bookmarked-posts page.

import {
  createBrowser, createPage, createTestDiscussion, apiFetch, apiPatchJson,
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
  console.log('bookmarks-page spec');

  await dbWriteSetting('post-bookmarks.buttonPosition', 'header');
  await clearCache();

  const { browser, context } = await createBrowser(COOKIE);
  const page = await createPage(context);

  try {
    // 1. Page loads
    await page.goto(`${BASE_URL}/bookmarked-posts`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.IndexPage, .Hero', { timeout: 10_000 });
    check('Page loads at /bookmarked-posts', true);

    // 2. Sidebar link
    const sidebarLink = await page.$('a[href*="bookmarked-posts"]');
    check('Sidebar contains "Bookmarks" nav link', !!sidebarLink);

    // 3. Empty state
    const placeholder = await page.$('.Placeholder');
    const postsList = await page.$('.PostsUserPage-list');
    check('Page shows content (empty state or bookmarks)', !!(placeholder || postsList));

    // Create a discussion and bookmark its first post
    const discussionId = await createTestDiscussion(
      'Bookmarks Page Test ' + Date.now(),
      'Post for bookmarks page test.',
      [],
      COOKIE
    );
    const discussion = await apiFetch(`/discussions/${discussionId}`, COOKIE);
    const firstPostId = discussion.data?.relationships?.firstPost?.data?.id
      || discussion.data?.relationships?.posts?.data?.[0]?.id;

    if (firstPostId) {
      await apiPatchJson(`/posts/${firstPostId}`, {
        data: { attributes: { bookmarked: true } }
      }, COOKIE);

      // 4. Bookmarked post appears
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const postItem = await page.$('.PostsUserPage-list li');
      check('Bookmarked post appears on page', !!postItem);

      // 5. Discussion title link
      const titleLink = await page.$('.PostsUserPage-discussion a');
      check('Post shows discussion title link', !!titleLink);

      // 6. Unbookmark removes post
      await apiPatchJson(`/posts/${firstPostId}`, {
        data: { attributes: { bookmarked: false } }
      }, COOKIE);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const allPostIds = await page.$$eval('.PostsUserPage-list .CommentPost', els =>
        els.map(e => e.getAttribute('data-id'))
      );
      check('Unbookmarking removes post from page', !allPostIds.includes(firstPostId));
    } else {
      check('Bookmarked post appears on page', false, 'could not find first post ID');
      check('Post shows discussion title link', false, 'skipped');
      check('Unbookmarking removes post from page', false, 'skipped');
    }

    // 7. No JS errors
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
