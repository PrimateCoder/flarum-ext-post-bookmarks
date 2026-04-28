// Admin settings spec — tests the extension's admin settings page.

import {
  createBrowser, createPage,
  dbWriteSetting, dbReadSetting, clearCache,
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
  console.log('admin-settings spec');

  // Reset to defaults first
  await dbWriteSetting('post-bookmarks.buttonPosition', 'header');
  await dbWriteSetting('post-bookmarks.headerBadge', '0');
  await clearCache();

  const { browser, context } = await createBrowser(COOKIE);
  const page = await createPage(context);

  try {
    // 1. Extension page loads
    await page.goto(`${BASE_URL}/admin#/extension/clarkwinkelmann-post-bookmarks`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ExtensionPage', { timeout: 15_000 });
    check('Extension page loads in admin', true);

    // 2. Button position dropdown
    const select = await page.$('select');
    if (select) {
      const options = await select.$$eval('option', opts => opts.map(o => o.value));
      check('Button position dropdown present with 3 options',
        options.length >= 3 && options.includes('header') && options.includes('actions') && options.includes('menu'),
        `found options: ${JSON.stringify(options)}`);
    } else {
      check('Button position dropdown present with 3 options', false, 'select element not found');
    }

    // 3. Header badge checkbox
    const checkbox = await page.$('input[type="checkbox"]');
    check('Header badge checkbox/switch present', !!checkbox);

    // 4. Save settings — change dropdown to "actions", then save
    if (select) {
      await select.selectOption('actions');
      // Wait for the save button to become enabled (dirty state)
      await page.waitForTimeout(500);
      const saveBtn = await page.$('button.Button--primary:not(.disabled)');
      if (saveBtn) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        const savedValue = await dbReadSetting('post-bookmarks.buttonPosition');
        check('Saving settings persists values', savedValue === 'actions',
          `expected "actions", got "${savedValue}"`);
      } else {
        // Try clicking even if disabled
        const anyPrimary = await page.$('button.Button--primary');
        if (anyPrimary) {
          await anyPrimary.click();
          await page.waitForTimeout(2000);
          const savedValue = await dbReadSetting('post-bookmarks.buttonPosition');
          check('Saving settings persists values', savedValue === 'actions',
            `expected "actions", got "${savedValue}"`);
        } else {
          check('Saving settings persists values', false, 'no save button found');
        }
      }

      // Restore
      await dbWriteSetting('post-bookmarks.buttonPosition', 'header');
      await clearCache();
    } else {
      check('Saving settings persists values', false, 'skipped — no select');
    }

    // 5. No JS errors
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
