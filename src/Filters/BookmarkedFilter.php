<?php

namespace ClarkWinkelmann\PostBookmarks\Filters;

use Flarum\Search\Database\DatabaseSearchState;
use Flarum\Search\Filter\FilterInterface;
use Flarum\Search\SearchState;
use Flarum\Search\ValidateFilterTrait;
use Flarum\User\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * @implements FilterInterface<DatabaseSearchState>
 */
class BookmarkedFilter implements FilterInterface
{
    use ValidateFilterTrait;

    public function getFilterKey(): string
    {
        return 'bookmarked';
    }

    public function filter(SearchState $state, string|array $value, bool $negate): void
    {
        $this->constrain($state->getQuery(), $state->getActor(), $negate);
    }

    protected function constrain(Builder $query, User $actor, bool $negate): void
    {
        $method = $negate ? 'whereNotIn' : 'whereIn';
        $query->$method('posts.id', function ($query) use ($actor) {
            $query->select('post_id')
                ->from('post_user_bookmark')
                ->where('user_id', $actor->id);
        });
    }
}
