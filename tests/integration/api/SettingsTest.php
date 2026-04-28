<?php

namespace ClarkWinkelmann\PostBookmarks\Tests\integration\api;

use Flarum\Testing\integration\TestCase;
use PHPUnit\Framework\Attributes\Test;

class SettingsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('clarkwinkelmann-post-bookmarks');
    }

    #[Test]
    public function button_position_setting_serialized_to_forum()
    {
        $this->setting('post-bookmarks.buttonPosition', 'actions');

        $response = $this->send(
            $this->request('GET', '/api', [
                'authenticatedAs' => 1,
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $json = json_decode($response->getBody()->getContents(), true);

        $this->assertEquals('actions', $json['data']['attributes']['post-bookmarks.buttonPosition']);
    }

    #[Test]
    public function header_badge_setting_serialized_to_forum()
    {
        $this->setting('post-bookmarks.headerBadge', '1');

        $response = $this->send(
            $this->request('GET', '/api', [
                'authenticatedAs' => 1,
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $json = json_decode($response->getBody()->getContents(), true);

        $this->assertTrue($json['data']['attributes']['post-bookmarks.headerBadge']);
    }

    #[Test]
    public function default_values_present()
    {
        $response = $this->send(
            $this->request('GET', '/api', [
                'authenticatedAs' => 1,
            ])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $json = json_decode($response->getBody()->getContents(), true);

        $this->assertArrayHasKey('post-bookmarks.buttonPosition', $json['data']['attributes']);
        $this->assertArrayHasKey('post-bookmarks.headerBadge', $json['data']['attributes']);
    }
}
