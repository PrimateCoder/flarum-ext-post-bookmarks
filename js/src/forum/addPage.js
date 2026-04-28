import {extend} from 'flarum/common/extend';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import LinkButton from 'flarum/common/components/LinkButton';

/* global app */

extend(IndexSidebar.prototype, 'navItems', function (items) {
    if (!app.session.user) {
        return;
    }

    items.add('post-bookmarks', LinkButton.component({
        href: app.route('postBookmarks'),
        icon: 'fas fa-bookmark',
    }, app.translator.trans('clarkwinkelmann-post-bookmarks.forum.page.link')));
});
