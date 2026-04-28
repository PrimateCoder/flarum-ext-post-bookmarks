<?php

namespace ClarkWinkelmann\PostBookmarks;

use Flarum\Api\Resource\PostResource;
use Flarum\Extend;
use Flarum\Post\Filter\PostSearcher;
use Flarum\Post\Post;
use Flarum\Search\Database\DatabaseSearchDriver;
use Flarum\User\User;
use Illuminate\Database\Eloquent\Relations;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->route('/bookmarked-posts', 'post-bookmarks'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    new Extend\Locales(__DIR__ . '/resources/locale'),

    (new Extend\Model(Post::class))
        ->relationship('bookmarks', function (Post $post): Relations\BelongsToMany {
            return $post->belongsToMany(User::class, 'post_user_bookmark', 'post_id')->withTimestamps();
        })
        ->relationship('bookmarkState', function (Post $post): Relations\HasOne {
            return $post->hasOne(UserState::class, 'post_id');
        }),

    (new Extend\ApiResource(PostResource::class))
        ->fields(Api\PostResourceFields::class),

    (new Extend\SearchDriver(DatabaseSearchDriver::class))
        ->addFilter(PostSearcher::class, Filters\BookmarkedFilter::class),

    (new Extend\Settings())
        ->serializeToForum('post-bookmarks.buttonPosition', 'post-bookmarks.buttonPosition')
        ->serializeToForum('post-bookmarks.headerBadge', 'post-bookmarks.headerBadge', 'boolval'),
];
