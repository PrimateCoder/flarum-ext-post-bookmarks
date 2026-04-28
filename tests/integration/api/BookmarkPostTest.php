<?php

namespace ClarkWinkelmann\PostBookmarks\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;

class BookmarkPostTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('clarkwinkelmann-post-bookmarks');

        $this->prepareDatabase([
            'users' => [
                $this->normalUser(),
                ['id' => 3, 'username' => 'user3', 'email' => 'user3@machine.local', 'is_email_confirmed' => 1],
            ],
            'discussions' => [
                ['id' => 1, 'title' => __CLASS__, 'created_at' => Carbon::now(), 'last_posted_at' => Carbon::now(), 'user_id' => 1, 'first_post_id' => 1, 'comment_count' => 2],
            ],
            'posts' => [
                ['id' => 1, 'number' => 1, 'discussion_id' => 1, 'created_at' => Carbon::now(), 'user_id' => 1, 'type' => 'comment', 'content' => '<t><p>first post</p></t>'],
                ['id' => 2, 'number' => 2, 'discussion_id' => 1, 'created_at' => Carbon::now(), 'user_id' => 2, 'type' => 'comment', 'content' => '<t><p>second post</p></t>'],
            ],
        ]);
    }

    /** @test */
    public function can_bookmark_a_post()
    {
        $response = $this->send(
            $this->request('PATCH', '/api/posts/1', [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'attributes' => [
                            'bookmarked' => true,
                        ],
                    ],
                ],
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $row = $this->database()->table('post_user_bookmark')
            ->where('post_id', 1)
            ->where('user_id', 2)
            ->first();

        $this->assertNotNull($row);
    }

    /** @test */
    public function bookmarked_attribute_is_true_after_bookmarking()
    {
        $this->send(
            $this->request('PATCH', '/api/posts/1', [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'attributes' => ['bookmarked' => true],
                    ],
                ],
            ])
        );

        $response = $this->send(
            $this->request('GET', '/api/posts/1', [
                'authenticatedAs' => 2,
            ])
        );

        $json = json_decode($response->getBody()->getContents(), true);

        $this->assertTrue($json['data']['attributes']['bookmarked']);
    }

    /** @test */
    public function can_unbookmark_a_post()
    {
        $this->prepareDatabase([
            'post_user_bookmark' => [
                ['post_id' => 1, 'user_id' => 2, 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ],
        ]);

        $response = $this->send(
            $this->request('PATCH', '/api/posts/1', [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'attributes' => ['bookmarked' => false],
                    ],
                ],
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $row = $this->database()->table('post_user_bookmark')
            ->where('post_id', 1)
            ->where('user_id', 2)
            ->first();

        $this->assertNull($row);
    }

    /** @test */
    public function bookmarked_attribute_is_false_after_unbookmarking()
    {
        $this->prepareDatabase([
            'post_user_bookmark' => [
                ['post_id' => 1, 'user_id' => 2, 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ],
        ]);

        $this->send(
            $this->request('PATCH', '/api/posts/1', [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'attributes' => ['bookmarked' => false],
                    ],
                ],
            ])
        );

        $response = $this->send(
            $this->request('GET', '/api/posts/1', [
                'authenticatedAs' => 2,
            ])
        );

        $json = json_decode($response->getBody()->getContents(), true);

        $this->assertFalse($json['data']['attributes']['bookmarked']);
    }

    /** @test */
    public function bookmarking_is_idempotent()
    {
        $this->send(
            $this->request('PATCH', '/api/posts/1', [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'attributes' => ['bookmarked' => true],
                    ],
                ],
            ])
        );

        $response = $this->send(
            $this->request('PATCH', '/api/posts/1', [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'attributes' => ['bookmarked' => true],
                    ],
                ],
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $count = $this->database()->table('post_user_bookmark')
            ->where('post_id', 1)
            ->where('user_id', 2)
            ->count();

        $this->assertEquals(1, $count);
    }

    /** @test */
    public function unbookmarking_is_idempotent()
    {
        $response = $this->send(
            $this->request('PATCH', '/api/posts/1', [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'attributes' => ['bookmarked' => false],
                    ],
                ],
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $count = $this->database()->table('post_user_bookmark')
            ->where('post_id', 1)
            ->where('user_id', 2)
            ->count();

        $this->assertEquals(0, $count);
    }

    /** @test */
    public function guest_cannot_bookmark()
    {
        $initial = $this->send($this->request('GET', '/'));
        $token = $initial->getHeaderLine('X-CSRF-Token');

        $response = $this->send(
            $this->request('PATCH', '/api/posts/1', [
                'cookiesFrom' => $initial,
                'json' => [
                    'data' => [
                        'attributes' => ['bookmarked' => true],
                    ],
                ],
            ])->withHeader('X-CSRF-Token', $token)
        );

        $this->assertEquals(401, $response->getStatusCode());
    }

    /** @test */
    public function different_users_bookmark_independently()
    {
        $this->send(
            $this->request('PATCH', '/api/posts/1', [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'attributes' => ['bookmarked' => true],
                    ],
                ],
            ])
        );

        // User 3 should see bookmarked=false
        $response = $this->send(
            $this->request('GET', '/api/posts/1', [
                'authenticatedAs' => 3,
            ])
        );

        $json = json_decode($response->getBody()->getContents(), true);

        $this->assertFalse($json['data']['attributes']['bookmarked']);
    }

    /** @test */
    public function two_users_can_bookmark_same_post()
    {
        $this->send(
            $this->request('PATCH', '/api/posts/1', [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'attributes' => ['bookmarked' => true],
                    ],
                ],
            ])
        );

        $this->send(
            $this->request('PATCH', '/api/posts/1', [
                'authenticatedAs' => 3,
                'json' => [
                    'data' => [
                        'attributes' => ['bookmarked' => true],
                    ],
                ],
            ])
        );

        $count = $this->database()->table('post_user_bookmark')
            ->where('post_id', 1)
            ->count();

        $this->assertEquals(2, $count);

        // Both see bookmarked=true
        $resp2 = $this->send($this->request('GET', '/api/posts/1', ['authenticatedAs' => 2]));
        $resp3 = $this->send($this->request('GET', '/api/posts/1', ['authenticatedAs' => 3]));

        $json2 = json_decode($resp2->getBody()->getContents(), true);
        $json3 = json_decode($resp3->getBody()->getContents(), true);

        $this->assertTrue($json2['data']['attributes']['bookmarked']);
        $this->assertTrue($json3['data']['attributes']['bookmarked']);
    }
}
