import Extend from 'flarum/common/extenders';
import app from 'flarum/admin/app';

export default [
  new Extend.Admin()
    .setting(
      () => ({
        setting: 'post-bookmarks.buttonPosition',
        label: app.translator.trans('clarkwinkelmann-post-bookmarks.admin.settings.buttonPosition'),
        type: 'select',
        options: {
          header: app.translator.trans('clarkwinkelmann-post-bookmarks.admin.settings.buttonPositionHeader'),
          actions: app.translator.trans('clarkwinkelmann-post-bookmarks.admin.settings.buttonPositionActions'),
          menu: app.translator.trans('clarkwinkelmann-post-bookmarks.admin.settings.buttonPositionMenu'),
        },
        default: 'header',
      }),
    )
    .setting(
      () => ({
        setting: 'post-bookmarks.headerBadge',
        label: app.translator.trans('clarkwinkelmann-post-bookmarks.admin.settings.headerBadge'),
        type: 'boolean',
      }),
    ),
];
