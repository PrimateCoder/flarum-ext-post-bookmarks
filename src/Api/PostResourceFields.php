<?php

namespace ClarkWinkelmann\PostBookmarks\Api;

use Flarum\Api\Context;
use Flarum\Api\Schema;
use Flarum\Post\Post;

class PostResourceFields
{
    public function __invoke(): array
    {
        return [
            Schema\Boolean::make('bookmarked')
                ->writable(function (Post $post, Context $context) {
                    return $context->updating();
                })
                ->get(function (Post $post, Context $context) {
                    return $post->bookmarks()
                        ->where('user_id', $context->getActor()->id)
                        ->exists();
                })
                ->set(function (Post $post, bool $value, Context $context) {
                    $actor = $context->getActor();
                    $actor->assertRegistered();

                    $currentValue = $post->bookmarks()
                        ->where('id', $actor->id)
                        ->exists();

                    if ($value === $currentValue) {
                        return;
                    }

                    if ($value) {
                        $post->bookmarks()->attach($actor);
                    } else {
                        $post->bookmarks()->detach($actor);
                    }
                }),
        ];
    }
}
