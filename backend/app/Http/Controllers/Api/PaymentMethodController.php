<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Payment Methods CRUD Controller (Phase 4)
 *
 * Manages saved payment methods for authenticated users.
 * All endpoints enforce ownership via user_id check.
 *
 * CRITICAL SECURITY:
 * - Never return 'token' or 'token_fingerprint' fields (PCI-DSS)
 * - Always verify user_id matches auth()->id()
 * - Use DB transactions for atomic operations
 */
class PaymentMethodController extends Controller
{
    /**
     * List all active saved payment methods for authenticated user
     *
     * GET /api/v1/payment-methods
     *
     * Returns only non-deleted, active cards.
     * Response fields: id, card_last_four, card_brand, expires_at,
     *                  is_default, is_verified, created_at
     *
     * SECURITY: Never returns token or token_fingerprint
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Get all active payment methods for user
            // Ordered by: default first, then newest first
            $paymentMethods = PaymentMethod::where('user_id', $user->id)
                ->whereNull('deleted_at') // Only non-deleted cards
                ->orderBy('is_default', 'desc')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($method) {
                    return [
                        'id' => $method->id,
                        'card_last_four' => $method->card_last_four,
                        'card_brand' => $method->card_brand,
                        'expires_at' => $method->expires_at?->format('Y-m-d'), // ISO 8601
                        'is_default' => $method->is_default,
                        'is_verified' => $method->is_verified,
                        'created_at' => $method->created_at->toIso8601String(),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'payment_methods' => $paymentMethods,
                ],
            ], 200);

        } catch (\Exception $e) {
            Log::error('Failed to list payment methods', [
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve payment methods',
            ], 500);
        }
    }

    /**
     * Set a payment method as default
     *
     * PUT /api/v1/payment-methods/{id}/default
     *
     * ATOMIC OPERATION:
     * - Unsets all other cards as default for user
     * - Sets selected card as default
     * - Uses DB transaction to ensure only 1 default per user
     *
     * SECURITY:
     * - Verifies card belongs to authenticated user
     * - Returns 403 if ownership check fails
     * - Returns 404 if card not found or deleted
     *
     * @param Request $request
     * @param int $id Payment method ID
     * @return JsonResponse
     */
    public function setDefault(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            // Find payment method and verify ownership
            $paymentMethod = PaymentMethod::where('id', $id)
                ->whereNull('deleted_at') // Only active cards
                ->first();

            // Check if card exists
            if (!$paymentMethod) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment method not found',
                ], 404);
            }

            // SECURITY: Enforce ownership
            if ($paymentMethod->user_id !== $user->id) {
                Log::warning('Unauthorized attempt to set default payment method', [
                    'user_id' => $user->id,
                    'payment_method_id' => $id,
                    'owner_user_id' => $paymentMethod->user_id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized action',
                ], 403);
            }

            // Check if card is expired
            if ($paymentMethod->isExpired()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot set expired card as default',
                ], 422);
            }

            // Set as default (uses existing atomic method from model)
            // This method already uses DB::transaction internally
            $paymentMethod->setAsDefault();

            return response()->json([
                'success' => true,
                'message' => 'Default payment method updated successfully',
                'data' => [
                    'payment_method' => [
                        'id' => $paymentMethod->id,
                        'card_last_four' => $paymentMethod->card_last_four,
                        'card_brand' => $paymentMethod->card_brand,
                        'is_default' => true, // Always true after setAsDefault()
                    ],
                ],
            ], 200);

        } catch (\Exception $e) {
            Log::error('Failed to set default payment method', [
                'user_id' => $request->user()?->id,
                'payment_method_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update default payment method',
            ], 500);
        }
    }

    /**
     * Soft delete a payment method
     *
     * DELETE /api/v1/payment-methods/{id}
     *
     * ATOMIC OPERATION:
     * - Soft deletes the card (sets deleted_at timestamp)
     * - If deleted card was default, auto-picks another active card as default
     * - Uses DB transaction to ensure consistency
     *
     * AUTO-PICK STRATEGY:
     * - Prefers most recently created verified card
     * - If no other cards exist, user will have no default (acceptable)
     *
     * SECURITY:
     * - Verifies card belongs to authenticated user
     * - Returns 403 if ownership check fails
     * - Returns 404 if card not found or already deleted
     *
     * @param Request $request
     * @param int $id Payment method ID
     * @return JsonResponse
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            return DB::transaction(function () use ($user, $id) {
                // Find payment method and verify ownership
                $paymentMethod = PaymentMethod::where('id', $id)
                    ->whereNull('deleted_at') // Only active cards
                    ->first();

                // Check if card exists
                if (!$paymentMethod) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Payment method not found',
                    ], 404);
                }

                // SECURITY: Enforce ownership
                if ($paymentMethod->user_id !== $user->id) {
                    Log::warning('Unauthorized attempt to delete payment method', [
                        'user_id' => $user->id,
                        'payment_method_id' => $id,
                        'owner_user_id' => $paymentMethod->user_id,
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized action',
                    ], 403);
                }

                // Remember if this was the default card
                $wasDefault = $paymentMethod->is_default;

                // Soft delete the card
                $paymentMethod->delete();

                Log::info('Payment method deleted', [
                    'user_id' => $user->id,
                    'payment_method_id' => $id,
                    'was_default' => $wasDefault,
                ]);

                // If deleted card was default, auto-pick next default
                if ($wasDefault) {
                    $nextDefault = PaymentMethod::where('user_id', $user->id)
                        ->whereNull('deleted_at')
                        ->where('is_verified', true) // Only verified cards
                        ->orderBy('created_at', 'desc') // Most recent first
                        ->first();

                    if ($nextDefault) {
                        // Unset all defaults first (safety)
                        PaymentMethod::where('user_id', $user->id)
                            ->whereNull('deleted_at')
                            ->update(['is_default' => false]);

                        // Set new default
                        $nextDefault->update(['is_default' => true]);

                        Log::info('Auto-picked new default payment method', [
                            'user_id' => $user->id,
                            'new_default_id' => $nextDefault->id,
                            'card_last_four' => $nextDefault->card_last_four,
                        ]);

                        return response()->json([
                            'success' => true,
                            'message' => 'Payment method deleted successfully',
                            'data' => [
                                'new_default' => [
                                    'id' => $nextDefault->id,
                                    'card_last_four' => $nextDefault->card_last_four,
                                    'card_brand' => $nextDefault->card_brand,
                                ],
                            ],
                        ], 200);
                    }

                    // No other cards exist - user has no default now
                    Log::info('No other cards available to set as default', [
                        'user_id' => $user->id,
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Payment method deleted successfully',
                    'data' => [
                        'new_default' => null, // No new default selected
                    ],
                ], 200);
            });

        } catch (\Exception $e) {
            Log::error('Failed to delete payment method', [
                'user_id' => $request->user()?->id,
                'payment_method_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete payment method',
            ], 500);
        }
    }
}
