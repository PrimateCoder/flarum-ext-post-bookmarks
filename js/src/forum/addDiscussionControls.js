import {extend} from 'flarum/common/extend';
import Button from 'flarum/common/components/Button';
import PostControls from 'flarum/forum/utils/PostControls';
import BookmarkButton from './components/BookmarkButton';
import CommentPost from 'flarum/forum/components/CommentPost';
import Icon from 'flarum/common/components/Icon';

/* global app, m */

extend(CommentPost.prototype, 'headerItems', function (items) {
    if (['actions', 'menu'].indexOf(app.forum.attribute('post-bookmarks.buttonPosition')) === -1) {
        if (!app.session.user) {
            return;
        }

        items.add('bookmark', BookmarkButton.component({
            className: 'Button Button--link',
            post: this.attrs.post,
        }));
    } else if (app.forum.attribute('post-bookmarks.headerBadge') && this.attrs.post.attribute('bookmarked')) {
        items.add('bookmark', m('span.BookmarkedPostLabel', [
            m(Icon, {name: 'fas fa-bookmark'}),
            ' ',
            app.translator.trans('clarkwinkelmann-post-bookmarks.forum.badge'),
        ]));
    }
});

extend(CommentPost.prototype, 'actionItems', function (items) {
    if (!app.session.user || app.forum.attribute('post-bookmarks.buttonPosition') !== 'actions') {
        return;
    }

    items.add('bookmark', BookmarkButton.component({
        className: 'Button Button--link',
        post: this.attrs.post,
    }));
});

extend(PostControls, 'userControls', function (items, post) {
    if (!app.session.user || app.forum.attribute('post-bookmarks.buttonPosition') !== 'menu') {
        return;
    }

    items.add('bookmark', BookmarkButton.component({
        post,
    }));
});
