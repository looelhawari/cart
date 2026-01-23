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
                            'type' => 'card',
                            'card_last_four' => '4242',
                            'card_brand' => 'visa',
                            'masked_card' => '**** **** **** 4242',
                            'is_default' => true,
                            'is_verified' => true,
                            'is_expired' => false,
                        ],
                    ],
                ],
            ])
            // SECURITY: Must NOT contain other user's card
            ->assertJsonMissing(['card_last_four' => '5555']);
    }

    /** @test */
    public function it_includes_expired_cards_with_is_expired_flag()
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
            'expires_at' => now()->addYear(),
        ]);

        $expiredCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '5555',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_expired_456',
            'is_verified' => true,
            'expires_at' => now()->subMonth(), // Expired last month
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/payment-methods');

        $response->assertStatus(200);

        $cards = $response->json('data.payment_methods');

        // ✅ BOTH cards should be included
        $this->assertCount(2, $cards);

        // ✅ Active card should have is_expired = false
        $activeCardData = collect($cards)->firstWhere('card_last_four', '4242');
        $this->assertFalse($activeCardData['is_expired']);

        // ✅ Expired card should have is_expired = true
        $expiredCardData = collect($cards)->firstWhere('card_last_four', '5555');
        $this->assertTrue($expiredCardData['is_expired']);
    }
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
    public function it_orders_payment_methods_by_eligibility()
    {
        // Create cards with different eligibility states
        $expiredCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '1111',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_expired_111',
            'is_verified' => true,
            'expires_at' => now()->subMonth(), // Expired
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
            'expires_at' => now()->addYear(), // Non-expired
            'created_at' => now()->subDays(5),
        ]);

        $eligibleCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '3333',
            'card_brand' => 'amex',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_eligible_333',
            'is_verified' => true,
            'expires_at' => now()->addYear(), // Non-expired
            'created_at' => now(), // Newest
        ]);

        $unverifiedCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4444',
            'card_brand' => 'discover',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_unverified_444',
            'is_verified' => false, // Unverified
            'created_at' => now()->addMinutes(1), // Newest overall
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/payment-methods');

        $response->assertStatus(200);

        $cards = $response->json('data.payment_methods');

        // ✅ SMART SORTING: default → eligible (non-expired verified) → others
        $this->assertEquals('2222', $cards[0]['card_last_four']); // Default (eligible)
        $this->assertEquals('3333', $cards[1]['card_last_four']); // Eligible (newest verified non-expired)
        // Remaining cards (unverified/expired) sorted by newest
        $this->assertContains($cards[2]['card_last_four'], ['4444', '1111']);
        $this->assertContains($cards[3]['card_last_four'], ['4444', '1111']);
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

    // ═══════════════════════════════════════════════════════
    // TEST: DEFAULT CARD INVARIANTS (Phase 4 Final)
    // ═══════════════════════════════════════════════════════

    /** @test */
    public function it_enforces_exactly_one_default_when_eligible_cards_exist()
    {
        // Create 3 eligible cards (verified + non-expired)
        $card1 = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '1111',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_card1',
            'is_verified' => true,
            'expires_at' => now()->addYear(),
        ]);

        $card2 = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '2222',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_card2',
            'is_verified' => true,
            'expires_at' => now()->addYear(),
        ]);

        $card3 = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '3333',
            'card_brand' => 'amex',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_card3',
            'is_verified' => true,
            'expires_at' => now()->addYear(),
        ]);

        // Set card2 as default
        $this->actingAs($this->user)
            ->putJson("/api/v1/payment-methods/{$card2->id}/default");

        // ✅ INVARIANT: Exactly one default exists
        $defaultCount = PaymentMethod::where('user_id', $this->user->id)
            ->whereNull('deleted_at')
            ->where('is_default', true)
            ->count();

        $this->assertEquals(1, $defaultCount, 'Exactly one card must be default when eligible cards exist');
    }

    /** @test */
    public function it_does_not_auto_pick_expired_card_as_default()
    {
        $defaultCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '1111',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_default',
            'is_default' => true,
            'is_verified' => true,
            'expires_at' => now()->addYear(),
        ]);

        $expiredCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '2222',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_expired',
            'is_verified' => true,
            'expires_at' => now()->subMonth(), // Expired
            'created_at' => now(), // Newer than default
        ]);

        // Delete default card
        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/payment-methods/{$defaultCard->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'new_default' => null, // ✅ No eligible card to auto-pick
                ],
            ]);

        // ✅ INVARIANT: Expired card should NOT be picked as default
        $this->assertDatabaseHas('payment_methods', [
            'id' => $expiredCard->id,
            'is_default' => false,
        ]);
    }

    /** @test */
    public function it_allows_null_default_when_all_cards_are_expired_or_unverified()
    {
        $defaultCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '1111',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_default',
            'is_default' => true,
            'is_verified' => true,
            'expires_at' => now()->addYear(),
        ]);

        $expiredCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '2222',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_expired',
            'is_verified' => true,
            'expires_at' => now()->subMonth(),
        ]);

        $unverifiedCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '3333',
            'card_brand' => 'amex',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_unverified',
            'is_verified' => false,
        ]);

        // Delete the only eligible card
        $this->actingAs($this->user)
            ->deleteJson("/api/v1/payment-methods/{$defaultCard->id}");

        // ✅ INVARIANT: Default can be null if all remaining cards are ineligible
        $defaultCount = PaymentMethod::where('user_id', $this->user->id)
            ->whereNull('deleted_at')
            ->where('is_default', true)
            ->count();

        $this->assertEquals(0, $defaultCount, 'Default can be null when all cards are expired/unverified');
    }

    /** @test */
    public function it_returns_expired_cards_in_listing_with_flag()
    {
        $activeCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_active',
            'is_default' => true,
            'is_verified' => true,
            'expires_at' => now()->addYear(),
        ]);

        $expiredCard = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '5555',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_expired',
            'is_verified' => true,
            'expires_at' => now()->subMonth(),
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/payment-methods');

        $response->assertStatus(200);

        $cards = $response->json('data.payment_methods');

        // ✅ Both cards included
        $this->assertCount(2, $cards);

        // ✅ Check is_expired flags
        $activeCardData = collect($cards)->firstWhere('card_last_four', '4242');
        $this->assertFalse($activeCardData['is_expired']);

        $expiredCardData = collect($cards)->firstWhere('card_last_four', '5555');
        $this->assertTrue($expiredCardData['is_expired']);
    }

    /** @test */
    public function it_matches_checkout_response_format()
    {
        $card = PaymentMethod::create([
            'user_id' => $this->user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'John Doe',
            'token' => 'tok_test',
            'is_default' => true,
            'is_verified' => true,
            'expires_at' => now()->addYear(),
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/payment-methods');

        $response->assertStatus(200);

        $cardData = $response->json('data.payment_methods.0');

        // ✅ Response format matches checkout
        $this->assertArrayHasKey('type', $cardData);
        $this->assertArrayHasKey('card_brand', $cardData);
        $this->assertArrayHasKey('card_last_four', $cardData);
        $this->assertArrayHasKey('masked_card', $cardData);
        $this->assertArrayHasKey('is_default', $cardData);
        $this->assertArrayHasKey('is_verified', $cardData);
        $this->assertArrayHasKey('is_expired', $cardData);
        $this->assertArrayHasKey('expires_at', $cardData);

        // ✅ Verify values
        $this->assertEquals('card', $cardData['type']);
        $this->assertEquals('**** **** **** 4242', $cardData['masked_card']);
        $this->assertEquals(false, $cardData['is_expired']);
    }
}
