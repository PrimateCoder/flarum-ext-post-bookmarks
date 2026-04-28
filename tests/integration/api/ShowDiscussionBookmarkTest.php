<?php

namespace ClarkWinkelmann\PostBookmarks\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;

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
                ['id' => 1, 'title' => __CLASS__, 'created_at' => Carbon::now(), 'last_posted_at' => Carbon::now(), 'user_id' => 1, 'first_post_id' => 1, 'comment_count' => 3, 'last_post_number' => 3, 'last_post_id' => 3],
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

    /** @test */
    public function posts_include_bookmarked_attribute_in_discussion_view()
    {
        $response = $this->send(
            $this->request('GET', '/api/discussions/1', [
                'authenticatedAs' => 2,
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $json = json_decode($response->getBody()->getContents(), true);

        $posts = collect($json['included'] ?? [])
            ->where('type', 'posts')
            ->values();

        $this->assertGreaterThan(0, $posts->count());

        foreach ($posts as $post) {
            $this->assertArrayHasKey('bookmarked', $post['attributes']);
        }
    }

    /** @test */
    public function bookmarked_is_true_for_bookmarked_post_in_discussion()
    {
        $response = $this->send(
            $this->request('GET', '/api/discussions/1', [
                'authenticatedAs' => 2,
            ])
        );

        $json = json_decode($response->getBody()->getContents(), true);

        $post2 = collect($json['included'] ?? [])
            ->where('type', 'posts')
            ->where('id', '2')
            ->first();

        $this->assertNotNull($post2);
        $this->assertTrue($post2['attributes']['bookmarked']);
    }

    /** @test */
    public function bookmarked_is_false_for_non_bookmarked_post()
    {
        $response = $this->send(
            $this->request('GET', '/api/discussions/1', [
                'authenticatedAs' => 2,
            ])
        );

        $json = json_decode($response->getBody()->getContents(), true);

        $post1 = collect($json['included'] ?? [])
            ->where('type', 'posts')
            ->where('id', '1')
            ->first();

        $post3 = collect($json['included'] ?? [])
            ->where('type', 'posts')
            ->where('id', '3')
            ->first();

        $this->assertNotNull($post1);
        $this->assertFalse($post1['attributes']['bookmarked']);

        $this->assertNotNull($post3);
        $this->assertFalse($post3['attributes']['bookmarked']);
    }
}
