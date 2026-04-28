<?php

namespace ClarkWinkelmann\PostBookmarks\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use PHPUnit\Framework\Attributes\RequiresPhpExtension;
use PHPUnit\Framework\Attributes\Test;

class CascadeDeleteTest extends TestCase
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
                ['id' => 1, 'title' => __CLASS__, 'slug' => 'test', 'created_at' => Carbon::now(), 'last_posted_at' => Carbon::now(), 'user_id' => 1, 'first_post_id' => 1, 'comment_count' => 2],
            ],
            'posts' => [
                ['id' => 1, 'number' => 1, 'discussion_id' => 1, 'created_at' => Carbon::now(), 'user_id' => 1, 'type' => 'comment', 'content' => '<t><p>first post</p></t>'],
                ['id' => 2, 'number' => 2, 'discussion_id' => 1, 'created_at' => Carbon::now(), 'user_id' => 2, 'type' => 'comment', 'content' => '<t><p>second post</p></t>'],
            ],
            'post_user_bookmark' => [
                ['post_id' => 1, 'user_id' => 2, 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
                ['post_id' => 2, 'user_id' => 2, 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
                ['post_id' => 1, 'user_id' => 1, 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ],
        ]);
    }

    #[Test]
    #[RequiresPhpExtension('pdo_mysql')]
    public function deleting_a_post_removes_its_bookmark_rows()
    {
        // FK cascades only enforced on MySQL/MariaDB; SQLite ignores them without PRAGMA foreign_keys
        if ($this->database()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('FK cascade requires MySQL/MariaDB');
        }

        $this->assertEquals(2, $this->database()->table('post_user_bookmark')->where('post_id', 1)->count());

        $response = $this->send(
            $this->request('DELETE', '/api/posts/1', [
                'authenticatedAs' => 1,
            ])
        );

        $this->assertEquals(204, $response->getStatusCode());

        $this->assertEquals(0, $this->database()->table('post_user_bookmark')->where('post_id', 1)->count());
    }

    #[Test]
    #[RequiresPhpExtension('pdo_mysql')]
    public function deleting_a_user_removes_their_bookmark_rows()
    {
        if ($this->database()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('FK cascade requires MySQL/MariaDB');
        }

        $this->assertEquals(2, $this->database()->table('post_user_bookmark')->where('user_id', 2)->count());

        $response = $this->send(
            $this->request('DELETE', '/api/users/2', [
                'authenticatedAs' => 1,
            ])
        );

        $this->assertEquals(204, $response->getStatusCode());

        $this->assertEquals(0, $this->database()->table('post_user_bookmark')->where('user_id', 2)->count());
    }
}
