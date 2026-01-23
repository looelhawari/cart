<?php

namespace Tests\Feature;

use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

/**
 * Payment Methods CRUD API Feature Tests (Phase 4)
 *
 * Tests all endpoints for Payment Methods management:
 * - GET /api/v1/payment-methods (list)
 * - PUT /api/v1/payment-methods/{id}/default (set default)
 * - DELETE /api/v1/payment-methods/{id} (soft delete)
 *
 * CRITICAL TEST COVERAGE:
 * - Ownership enforcement (user can only access their own cards)
 * - Atomic default switching (only 1 default per user)
 * - Auto-pick next default after deletion
 * - Security (no token/fingerprint in responses)
 * - Soft delete behavior
 */
class PaymentMethodTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test users
        $this->user = User::factory()->create();
        $this->otherUser = User::factory()->create();
    }

    // ═══════════════════════════════════════════════════════
    // TEST: GET /api/v1/payment-methods
    // ═══════════════════════════════════════════════════════

    /** @test */
    public function it_returns_empty_list_when_user_has_no_payment_methods()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/payment-methods');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'payment_methods' => [],
                ],
            ]);
    }

    /** @test */
    public function it_returns_only_users_payment_methods()
    {
        // Create payment methods for both users
        $userCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_user_card_123',
            'is_default' => true,
            'is_verified' => true,
            'expires_at' => now()->addYear(),
        ]);

        $otherUserCard = PaymentMethod::create([
            'user_id' => $this->otherUser->id,
            'type' => 'card',
            'card_last_four' => '5555',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'Jane Smith',
            'token' => 'tok_other_user_card_456',
            'is_default' => true,
            'is_verified' => true,
            'expires_at' => now()->addYear(),
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/payment-methods');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'payment_methods' => [
                        [
                            'id' => $userCard->id,
                            'card_last_four' => '4242',
                            'card_brand' => 'visa',
                            'is_default' => true,
                            'is_verified' => true,
                        ],
                    ],
                ],
            ])
            // SECURITY: Must NOT contain other user's card
            ->assertJsonMissing(['card_last_four' => '5555']);
    }

    /** @test */
    public function it_does_not_return_deleted_payment_methods()
    {
        $activeCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_active_123',
            'is_default' => true,
            'is_verified' => true,
        ]);

        $deletedCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '5555',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_deleted_456',
            'is_verified' => true,
        ]);

        // Soft delete the second card
        $deletedCard->delete();

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/payment-methods');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'payment_methods' => [
                        ['card_last_four' => '4242'],
                    ],
                ],
            ])
            ->assertJsonMissing(['card_last_four' => '5555']);

        // Verify only 1 card returned
        $this->assertCount(1, $response->json('data.payment_methods'));
    }

    /** @test */
    public function it_never_returns_token_or_token_fingerprint()
    {
        PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_secret_123',
            'is_default' => true,
            'is_verified' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/payment-methods');

        $response->assertStatus(200);

        // SECURITY: Must NOT contain token or token_fingerprint
        $responseData = $response->json();
        $this->assertStringNotContainsString('token', json_encode($responseData));
        $this->assertStringNotContainsString('tok_secret_123', json_encode($responseData));
    }

    /** @test */
    public function it_orders_payment_methods_default_first_then_newest()
    {
        // Create 3 cards with different timestamps
        $oldCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '1111',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_old_111',
            'is_verified' => true,
            'created_at' => now()->subDays(10),
        ]);

        $defaultCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '2222',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_default_222',
            'is_default' => true,
            'is_verified' => true,
            'created_at' => now()->subDays(5),
        ]);

        $newestCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '3333',
            'card_brand' => 'amex',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_newest_333',
            'is_verified' => true,
            'created_at' => now(),
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/payment-methods');

        $response->assertStatus(200);

        $cards = $response->json('data.payment_methods');

        // Verify order: Default first, then newest, then oldest
        $this->assertEquals('2222', $cards[0]['card_last_four']); // Default
        $this->assertEquals('3333', $cards[1]['card_last_four']); // Newest
        $this->assertEquals('1111', $cards[2]['card_last_four']); // Oldest
    }

    /** @test */
    public function it_requires_authentication()
    {
        $response = $this->getJson('/api/v1/payment-methods');

        $response->assertStatus(401);
    }

    // ═══════════════════════════════════════════════════════
    // TEST: PUT /api/v1/payment-methods/{id}/default
    // ═══════════════════════════════════════════════════════

    /** @test */
    public function it_sets_payment_method_as_default()
    {
        $card1 = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_card1_123',
            'is_default' => true,
            'is_verified' => true,
        ]);

        $card2 = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '5555',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_card2_456',
            'is_verified' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/payment-methods/{$card2->id}/default");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Default payment method updated successfully',
                'data' => [
                    'payment_method' => [
                        'id' => $card2->id,
                        'card_last_four' => '5555',
                        'is_default' => true,
                    ],
                ],
            ]);

        // Verify in database: Only card2 is default
        $this->assertDatabaseHas('payment_methods', [
            'id' => $card1->id,
            'is_default' => false,
        ]);

        $this->assertDatabaseHas('payment_methods', [
            'id' => $card2->id,
            'is_default' => true,
        ]);
    }

    /** @test */
    public function it_ensures_only_one_default_per_user_atomically()
    {
        // Create 3 cards for user
        $cards = [];
        for ($i = 1; $i <= 3; $i++) {
            $cards[] = PaymentMethod::create([
                'user_id' => $this->user->id,
                'type' => 'card',
                'card_last_four' => str_pad($i, 4, '0', STR_PAD_LEFT),
                'card_brand' => 'visa',
                'card_holder_name' => 'John Doe',
                'token' => "tok_card_{$i}",
                'is_verified' => true,
            ]);
        }

        // Set card 2 as default
        $this->actingAs($this->user)
            ->putJson("/api/v1/payment-methods/{$cards[1]->id}/default");

        // Verify only 1 default exists
        $defaultCount = PaymentMethod::where('user_id', $this->user->id)
            ->where('is_default', true)
            ->count();

        $this->assertEquals(1, $defaultCount, 'Only one card should be default');

        // Set card 3 as default
        $this->actingAs($this->user)
            ->putJson("/api/v1/payment-methods/{$cards[2]->id}/default");

        // Verify still only 1 default exists
        $defaultCount = PaymentMethod::where('user_id', $this->user->id)
            ->where('is_default', true)
            ->count();

        $this->assertEquals(1, $defaultCount, 'Only one card should remain default');

        // Verify card 3 is the default
        $this->assertDatabaseHas('payment_methods', [
            'id' => $cards[2]->id,
            'is_default' => true,
        ]);
    }

    /** @test */
    public function it_prevents_setting_other_users_card_as_default()
    {
        $otherUserCard = PaymentMethod::create([
            'user_id' => $this->otherUser->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'Jane Smith',
            'token' => 'tok_other_123',
            'is_verified' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/payment-methods/{$otherUserCard->id}/default");

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthorized action',
            ]);

        // Verify card was NOT modified
        $this->assertDatabaseHas('payment_methods', [
            'id' => $otherUserCard->id,
            'is_default' => false,
        ]);
    }

    /** @test */
    public function it_returns_404_for_non_existent_payment_method()
    {
        $response = $this->actingAs($this->user)
            ->putJson('/api/v1/payment-methods/99999/default');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Payment method not found',
            ]);
    }

    /** @test */
    public function it_returns_404_for_deleted_payment_method()
    {
        $card = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_deleted_123',
            'is_verified' => true,
        ]);

        // Soft delete the card
        $card->delete();

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/payment-methods/{$card->id}/default");

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Payment method not found',
            ]);
    }

    /** @test */
    public function it_prevents_setting_expired_card_as_default()
    {
        $expiredCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_expired_123',
            'is_verified' => true,
            'expires_at' => now()->subMonth(), // Expired last month
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/payment-methods/{$expiredCard->id}/default");

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Cannot set expired card as default',
            ]);
    }

    // ═══════════════════════════════════════════════════════
    // TEST: DELETE /api/v1/payment-methods/{id}
    // ═══════════════════════════════════════════════════════

    /** @test */
    public function it_soft_deletes_payment_method()
    {
        $card = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_delete_123',
            'is_verified' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/payment-methods/{$card->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Payment method deleted successfully',
            ]);

        // Verify soft delete (deleted_at is set)
        $this->assertSoftDeleted('payment_methods', [
            'id' => $card->id,
        ]);

        // Verify card still exists in database
        $this->assertDatabaseHas('payment_methods', [
            'id' => $card->id,
            'card_last_four' => '4242',
        ]);
    }

    /** @test */
    public function it_auto_picks_new_default_when_deleting_default_card()
    {
        $defaultCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '1111',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_default_111',
            'is_default' => true,
            'is_verified' => true,
            'created_at' => now()->subDays(5),
        ]);

        $newestCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '2222',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_newest_222',
            'is_verified' => true,
            'created_at' => now(),
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/payment-methods/{$defaultCard->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'new_default' => [
                        'id' => $newestCard->id,
                        'card_last_four' => '2222',
                        'card_brand' => 'mastercard',
                    ],
                ],
            ]);

        // Verify newest card is now default
        $this->assertDatabaseHas('payment_methods', [
            'id' => $newestCard->id,
            'is_default' => true,
        ]);

        // Verify deleted card is no longer default
        $deletedCard = PaymentMethod::withTrashed()->find($defaultCard->id);
        $this->assertFalse($deletedCard->is_default);
    }

    /** @test */
    public function it_returns_null_new_default_when_no_other_cards_exist()
    {
        $onlyCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_only_123',
            'is_default' => true,
            'is_verified' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/payment-methods/{$onlyCard->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'new_default' => null,
                ],
            ]);
    }

    /** @test */
    public function it_prevents_deleting_other_users_card()
    {
        $otherUserCard = PaymentMethod::create([
            'user_id' => $this->otherUser->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'Jane Smith',
            'token' => 'tok_other_123',
            'is_verified' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/payment-methods/{$otherUserCard->id}");

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthorized action',
            ]);

        // Verify card was NOT deleted
        $this->assertDatabaseHas('payment_methods', [
            'id' => $otherUserCard->id,
            'deleted_at' => null,
        ]);
    }

    /** @test */
    public function it_returns_404_when_deleting_non_existent_card()
    {
        $response = $this->actingAs($this->user)
            ->deleteJson('/api/v1/payment-methods/99999');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Payment method not found',
            ]);
    }

    /** @test */
    public function it_returns_404_when_deleting_already_deleted_card()
    {
        $card = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_deleted_123',
            'is_verified' => true,
        ]);

        // Soft delete the card first
        $card->delete();

        // Try to delete again
        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/payment-methods/{$card->id}");

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Payment method not found',
            ]);
    }

    /** @test */
    public function it_only_picks_verified_cards_as_new_default()
    {
        $defaultCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '1111',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_default_111',
            'is_default' => true,
            'is_verified' => true,
            'created_at' => now()->subDays(5),
        ]);

        $unverifiedCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '2222',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_unverified_222',
            'is_verified' => false, // NOT VERIFIED
            'created_at' => now(),
        ]);

        $verifiedCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '3333',
            'card_brand' => 'amex',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_verified_333',
            'is_verified' => true,
            'created_at' => now()->subDays(1),
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/payment-methods/{$defaultCard->id}");

        $response->assertStatus(200);

        // Verify VERIFIED card is picked, not unverified (even though unverified is newer)
        $this->assertDatabaseHas('payment_methods', [
            'id' => $verifiedCard->id,
            'is_default' => true,
        ]);

        $this->assertDatabaseHas('payment_methods', [
            'id' => $unverifiedCard->id,
            'is_default' => false,
        ]);
    }
}
