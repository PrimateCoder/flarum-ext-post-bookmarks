// Visual baseline spec — pixel-level regression tests for bookmark UI elements.
//
// Captures and compares screenshots for each visual state:
//   1. Bookmark button (unbookmarked) in header position
//   2. Bookmark button (bookmarked) in header position
//   3. Bookmark button in actions position
//   4. Bookmark button in post menu
//   5. Bookmarked post label (header badge)
//
// Set BASELINE_UPDATE=1 to accept new baselines.
// Baselines are committed in tests/ux/_baselines/.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  createBrowser, createPage, createTestDiscussion,
  dbWriteSetting, clearCache, apiPatchJson, apiFetch,
  compareScreenshot,
  BASE_URL,
} from '../../.pianotell/tests/ux/helpers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINES = resolve(HERE, '_baselines');
const COOKIE = process.env.PIANOTELL_FLARUM_UX_COOKIE;
const UPDATE = process.env.BASELINE_UPDATE === '1';

if (!BASE_URL || !COOKIE) {
  console.error('PIANOTELL_FLARUM_UX_BASE_URL and PIANOTELL_FLARUM_UX_COOKIE must be set.');
  process.exit(2);
}

const failures = [];
function check(label, ok, detail) {
  if (ok) console.log(`  ✓ ${label}${detail ? '  ' + detail : ''}`);
  else { console.log(`  ✗ ${label}  ${detail ?? ''}`); failures.push({ label, detail }); }
}

async function screenshotElement(page, selector) {
  const el = await page.$(selector);
  if (!el) return null;
  const box = await el.boundingBox();
  if (!box) return null;
  // Add small padding around the element
  const pad = 4;
  return {
    x: Math.max(0, Math.round(box.x - pad)),
    y: Math.max(0, Math.round(box.y - pad)),
    width: Math.round(box.width + pad * 2),
    height: Math.round(box.height + pad * 2),
  };
}

(async () => {
  console.log('visual-baseline spec');

  const discussionId = await createTestDiscussion(
    'Visual Baseline Test ' + Date.now(),
    'Post for visual baseline.',
    [],
    COOKIE
  );
  const discussion = await apiFetch(`/discussions/${discussionId}`, COOKIE);
  const firstPostId = discussion.data?.relationships?.firstPost?.data?.id
    || discussion.data?.relationships?.posts?.data?.[0]?.id;

  const { browser, context } = await createBrowser(COOKIE);
  const page = await createPage(context);

  try {
    // 1. Unbookmarked button — header position
    await dbWriteSetting('post-bookmarks.buttonPosition', 'header');
    await dbWriteSetting('post-bookmarks.headerBadge', '0');
    await clearCache();
    await page.goto(`${BASE_URL}/d/${discussionId}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });

    let clip = await screenshotElement(page, '.item-bookmark');
    if (clip) {
      const r = await compareScreenshot(page, {
        baselinePath: resolve(BASELINES, 'btn-header-unbookmarked.png'),
        clip, update: UPDATE, maxDiffPixels: 100,
      });
      check('Unbookmarked button (header)', r.pass, r.detail);
    } else {
      check('Unbookmarked button (header)', false, 'element not found');
    }

    // 2. Bookmarked button — header position
    if (firstPostId) {
      await apiPatchJson(`/posts/${firstPostId}`, {
        data: { attributes: { bookmarked: true } }
      }, COOKIE);
    }
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });

    clip = await screenshotElement(page, '.item-bookmark');
    if (clip) {
      const r = await compareScreenshot(page, {
        baselinePath: resolve(BASELINES, 'btn-header-bookmarked.png'),
        clip, update: UPDATE, maxDiffPixels: 100,
      });
      check('Bookmarked button (header)', r.pass, r.detail);
    } else {
      check('Bookmarked button (header)', false, 'element not found');
    }

    // 3. Button in actions position
    await dbWriteSetting('post-bookmarks.buttonPosition', 'actions');
    await clearCache();
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });

    clip = await screenshotElement(page, '.Post-actions .item-bookmark');
    if (clip) {
      const r = await compareScreenshot(page, {
        baselinePath: resolve(BASELINES, 'btn-actions-bookmarked.png'),
        clip, update: UPDATE, maxDiffPixels: 100,
      });
      check('Bookmarked button (actions)', r.pass, r.detail);
    } else {
      check('Bookmarked button (actions)', false, 'element not found');
    }

    // 4. Button in post menu
    await dbWriteSetting('post-bookmarks.buttonPosition', 'menu');
    await clearCache();
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });

    const menuToggle = await page.$('.Post-controls .Dropdown-toggle');
    if (menuToggle) {
      await menuToggle.click();
      await page.waitForTimeout(500);
      clip = await screenshotElement(page, '.Dropdown-menu .item-bookmark');
      if (clip) {
        const r = await compareScreenshot(page, {
          baselinePath: resolve(BASELINES, 'btn-menu-bookmarked.png'),
          clip, update: UPDATE, maxDiffPixels: 100,
        });
        check('Bookmarked button (menu)', r.pass, r.detail);
      } else {
        check('Bookmarked button (menu)', false, 'element not found in menu');
      }
    } else {
      check('Bookmarked button (menu)', false, 'menu toggle not found');
    }

    // 5. Header badge label
    await dbWriteSetting('post-bookmarks.buttonPosition', 'actions');
    await dbWriteSetting('post-bookmarks.headerBadge', '1');
    await clearCache();
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.PostStream', { timeout: 10_000 });

    clip = await screenshotElement(page, '.BookmarkedPostLabel');
    if (clip) {
      const r = await compareScreenshot(page, {
        baselinePath: resolve(BASELINES, 'badge-bookmarked.png'),
        clip, update: UPDATE, maxDiffPixels: 100,
      });
      check('Header badge label', r.pass, r.detail);
    } else {
      check('Header badge label', false, 'element not found');
    }

    // 6. Admin extension page
    if (firstPostId) {
      await apiPatchJson(`/posts/${firstPostId}`, {
        data: { attributes: { bookmarked: false } }
      }, COOKIE);
    }
    await dbWriteSetting('post-bookmarks.buttonPosition', 'header');
    await dbWriteSetting('post-bookmarks.headerBadge', '0');
    await clearCache();

    await page.goto(`${BASE_URL}/admin#/extension/clarkwinkelmann-post-bookmarks`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ExtensionPage', { timeout: 15_000 });
    // Wait for settings form to fully render
    await page.waitForSelector('select', { timeout: 5_000 });
    await page.waitForTimeout(500);

    clip = await screenshotElement(page, '.ExtensionPage-settings');
    if (!clip) {
      // Fall back to the whole extension body
      clip = await screenshotElement(page, '.ExtensionPage-body');
    }
    if (clip) {
      const r = await compareScreenshot(page, {
        baselinePath: resolve(BASELINES, 'admin-settings.png'),
        clip, update: UPDATE, maxDiffPixels: 200,
      });
      check('Admin settings page', r.pass, r.detail);
    } else {
      check('Admin settings page', false, 'settings container not found');
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
