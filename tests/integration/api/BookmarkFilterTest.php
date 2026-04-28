<?php

namespace ClarkWinkelmann\PostBookmarks\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use PHPUnit\Framework\Attributes\Test;

class BookmarkFilterTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('clarkwinkelmann-post-bookmarks');

        $this->prepareDatabase([
            'users' => [
                $this->normalUser(),
                ['id' => 3, 'username' => 'user3', 'password' => $this->normalUser()['password'], 'email' => 'user3@machine.local', 'is_email_confirmed' => 1],
            ],
            'discussions' => [
                ['id' => 1, 'title' => 'Discussion 1', 'slug' => 'test', 'created_at' => Carbon::now(), 'last_posted_at' => Carbon::now(), 'user_id' => 1, 'first_post_id' => 1, 'comment_count' => 3],
            ],
            'posts' => [
                ['id' => 1, 'number' => 1, 'discussion_id' => 1, 'created_at' => Carbon::now(), 'user_id' => 1, 'type' => 'comment', 'content' => '<t><p>post one</p></t>'],
                ['id' => 2, 'number' => 2, 'discussion_id' => 1, 'created_at' => Carbon::now(), 'user_id' => 1, 'type' => 'comment', 'content' => '<t><p>post two</p></t>'],
                ['id' => 3, 'number' => 3, 'discussion_id' => 1, 'created_at' => Carbon::now(), 'user_id' => 1, 'type' => 'comment', 'content' => '<t><p>post three</p></t>'],
            ],
            'post_user_bookmark' => [
                ['post_id' => 1, 'user_id' => 2, 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
                ['post_id' => 3, 'user_id' => 2, 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
                ['post_id' => 2, 'user_id' => 3, 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ],
        ]);
    }

    #[Test]
    public function returns_bookmarked_posts_for_current_user()
    {
        $response = $this->send(
            $this->request('GET', '/api/posts', [
                'authenticatedAs' => 2,
            ])->withQueryParams([
                'filter' => ['bookmarked' => true, 'type' => 'comment'],
                'sort' => '-createdAt',
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $json = json_decode($response->getBody()->getContents(), true);

        $ids = array_column($json['data'], 'id');
        $this->assertCount(2, $ids);
        $this->assertContains('1', $ids);
        $this->assertContains('3', $ids);
    }

    #[Test]
    public function returns_empty_when_no_bookmarks()
    {
        // User 1 (admin) has no bookmarks
        $response = $this->send(
            $this->request('GET', '/api/posts', [
                'authenticatedAs' => 1,
            ])->withQueryParams([
                'filter' => ['bookmarked' => true, 'type' => 'comment'],
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $json = json_decode($response->getBody()->getContents(), true);

        $this->assertCount(0, $json['data']);
    }

    #[Test]
    public function only_returns_current_users_bookmarks()
    {
        // User 3 bookmarked only post 2
        $response = $this->send(
            $this->request('GET', '/api/posts', [
                'authenticatedAs' => 3,
            ])->withQueryParams([
                'filter' => ['bookmarked' => true, 'type' => 'comment'],
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $json = json_decode($response->getBody()->getContents(), true);

        $ids = array_column($json['data'], 'id');
        $this->assertCount(1, $ids);
        $this->assertContains('2', $ids);
    }

    #[Test]
    public function combines_with_type_filter()
    {
        $response = $this->send(
            $this->request('GET', '/api/posts', [
                'authenticatedAs' => 2,
            ])->withQueryParams([
                'filter' => ['bookmarked' => true, 'type' => 'comment'],
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $json = json_decode($response->getBody()->getContents(), true);

        foreach ($json['data'] as $post) {
            $this->assertEquals('comment', $post['attributes']['contentType']);
        }
    }

    #[Test]
    public function negate_filter_returns_unbookmarked_posts()
    {
        $response = $this->send(
            $this->request('GET', '/api/posts', [
                'authenticatedAs' => 2,
            ])->withQueryParams([
                'filter' => ['-bookmarked' => true, 'type' => 'comment'],
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $json = json_decode($response->getBody()->getContents(), true);

        $ids = array_column($json['data'], 'id');
        // User 2 bookmarked posts 1 and 3, so post 2 is unbookmarked
        $this->assertContains('2', $ids);
        $this->assertNotContains('1', $ids);
        $this->assertNotContains('3', $ids);
    }

    #[Test]
    public function guest_filter_returns_empty()
    {
        $response = $this->send(
            $this->request('GET', '/api/posts')->withQueryParams([
                'filter' => ['bookmarked' => true, 'type' => 'comment'],
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $json = json_decode($response->getBody()->getContents(), true);

        $this->assertCount(0, $json['data']);
    }
}
