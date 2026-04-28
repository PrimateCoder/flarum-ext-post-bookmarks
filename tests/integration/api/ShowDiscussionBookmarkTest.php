<?php

namespace ClarkWinkelmann\PostBookmarks\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use PHPUnit\Framework\Attributes\Test;

class ShowDiscussionBookmarkTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('clarkwinkelmann-post-bookmarks');

        $this->prepareDatabase([
            'users' => [
                $this->normalUser(),
            ],
            'discussions' => [
                ['id' => 1, 'title' => __CLASS__, 'slug' => 'test', 'created_at' => Carbon::now(), 'last_posted_at' => Carbon::now(), 'user_id' => 1, 'first_post_id' => 1, 'comment_count' => 3, 'last_post_number' => 3, 'last_post_id' => 3],
            ],
            'posts' => [
                ['id' => 1, 'number' => 1, 'discussion_id' => 1, 'created_at' => Carbon::now(), 'user_id' => 1, 'type' => 'comment', 'content' => '<t><p>first post</p></t>'],
                ['id' => 2, 'number' => 2, 'discussion_id' => 1, 'created_at' => Carbon::now(), 'user_id' => 1, 'type' => 'comment', 'content' => '<t><p>second post</p></t>'],
                ['id' => 3, 'number' => 3, 'discussion_id' => 1, 'created_at' => Carbon::now(), 'user_id' => 1, 'type' => 'comment', 'content' => '<t><p>third post</p></t>'],
            ],
            'post_user_bookmark' => [
                ['post_id' => 2, 'user_id' => 2, 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ],
        ]);
    }

    #[Test]
    public function posts_include_bookmarked_attribute_when_listing()
    {
        $response = $this->send(
            $this->request('GET', '/api/posts', [
                'authenticatedAs' => 2,
            ])->withQueryParams([
                'filter' => ['discussion' => 1],
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $json = json_decode($response->getBody()->getContents(), true);

        $this->assertGreaterThan(0, count($json['data']));

        foreach ($json['data'] as $post) {
            $this->assertArrayHasKey('bookmarked', $post['attributes']);
        }
    }

    #[Test]
    public function bookmarked_is_true_for_bookmarked_post()
    {
        $response = $this->send(
            $this->request('GET', '/api/posts/2', [
                'authenticatedAs' => 2,
            ])
        );

        $json = json_decode($response->getBody()->getContents(), true);

        $this->assertTrue($json['data']['attributes']['bookmarked']);
    }

    #[Test]
    public function bookmarked_is_false_for_non_bookmarked_post()
    {
        $response = $this->send(
            $this->request('GET', '/api/posts/1', [
                'authenticatedAs' => 2,
            ])
        );

        $json1 = json_decode($response->getBody()->getContents(), true);
        $this->assertFalse($json1['data']['attributes']['bookmarked']);

        $response = $this->send(
            $this->request('GET', '/api/posts/3', [
                'authenticatedAs' => 2,
            ])
        );

        $json3 = json_decode($response->getBody()->getContents(), true);
        $this->assertFalse($json3['data']['attributes']['bookmarked']);
    }
}
