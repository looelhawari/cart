<?php

namespace App\Services;

use App\Models\PromoCode;
use App\Models\PromoCodeUsage;
use App\Models\User;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

/**
 * ⚠ PREVIEW / RECOMMENDATION engine.
 *
 * This service powers `/promo-codes/preview` and the "best codes for you"
 * recommendation API. It is NOT the engine that calculates the discount
 * applied at order creation — that is `CartService::evaluatePromoForCart`
 * (canonical, has targeting/audience checks, has the negative-total clamp).
 *
 * If you change discount math, change BOTH places.
 */
class PromoCodeService
{
    /**
     * Validate and apply a promo code to a cart
     * This is the MAIN method that handles everything
     */
    public function applyPromoCode(
        string $code,
        int $userId,
        array $cartItems,
        float $subtotal,
        float $deliveryFee = 0
    ): array {
        // Find the promo code
        $promoCode = PromoCode::where('code', strtoupper(trim($code)))->first();

        if (!$promoCode) {
            return $this->error('Invalid promo code', 'CODE_NOT_FOUND');
        }

        // Check if user has any previous orders (for first_order_only)
        $isFirstOrder = Order::where('user_id', $userId)
            ->whereNotIn('status', ['cancelled', 'failed'])
            ->count() === 0;

        // Validate the promo code for this user
        $validation = $promoCode->validateForUser($userId, $subtotal, $isFirstOrder);

        if (!$validation['valid']) {
            // Get smart suggestions
            $suggestions = $promoCode->getSuggestionsForUser($userId, $cartItems, $subtotal, $isFirstOrder);
            
            return $this->error(
                $validation['errors'][0] ?? 'Invalid promo code',
                'VALIDATION_FAILED',
                [
                    'errors' => $validation['errors'],
                    'suggestions' => $suggestions['suggestions'] ?? [],
                ]
            );
        }

        // Calculate the discount
        $discountResult = $promoCode->calculateDiscount($cartItems, $subtotal);

        // Handle free delivery
        $finalDeliveryFee = $discountResult['free_delivery'] ? 0 : $deliveryFee;
        $deliverySavings = $discountResult['free_delivery'] ? $deliveryFee : 0;

        // Calculate final amounts
        $totalDiscount = $discountResult['discount_amount'] + $deliverySavings;
        $finalTotal = $subtotal + $finalDeliveryFee - $discountResult['discount_amount'];

        // KNOWN LIMITATION (audit I13 — BOGO engine duplication):
        // The numbers returned here are computed by the PREVIEW engine
        // (PromoCode::calculateDiscount + PromoCodeBogoRule::applyToCart).
        // The CHARGE-TIME engine used at order creation is
        // CartService::evaluatePromoForCart. For percentage/fixed_amount/
        // free_delivery promos the two engines agree; for BOGO rules with
        // complex eligibility (cross-category get-scope, mixed buy-scope)
        // they may differ. Flag this in the response so the frontend can
        // display "Estimated savings" rather than presenting an exact total
        // the customer will then see change at checkout.
        return $this->success([
            'promo_code' => [
                'id' => $promoCode->id,
                'code' => $promoCode->code,
                'type' => $promoCode->type,
                'applies_to' => $promoCode->applies_to,
                'display' => $promoCode->discount_display,
            ],
            'discount' => [
                'amount' => $discountResult['discount_amount'],
                'delivery_savings' => $deliverySavings,
                'total_savings' => $totalDiscount,
                'free_delivery' => $discountResult['free_delivery'],
            ],
            'calculation' => [
                'subtotal' => $subtotal,
                'delivery_fee' => $finalDeliveryFee,
                'discount' => $discountResult['discount_amount'],
                'final_total' => max(0, $finalTotal),
            ],
            'applied_items'   => $discountResult['applied_items'] ?? [],
            'bogo_details'    => $discountResult['bogo_details'] ?? null,
            'remaining_uses'  => $validation['remaining_uses'],
            'message'         => $this->getSuccessMessage($promoCode, $totalDiscount),
            'is_estimate'     => $promoCode->type === 'bogo',  // true only when BOGO engines may diverge
            'engine'          => 'preview',                    // canonical engine at checkout: CartService::evaluatePromoForCart
        ]);
    }

    /**
     * Get best available promo codes for a user
     * Smart AI-like recommendation
     */
    public function getBestPromoCodesForUser(
        int $userId,
        array $cartItems,
        float $subtotal,
        float $deliveryFee = 0,
        int $limit = 5
    ): array {
        $isFirstOrder = Order::where('user_id', $userId)
            ->whereNotIn('status', ['cancelled', 'failed'])
            ->count() === 0;

        // Get all available promo codes
        $promoCodes = PromoCode::available()->get();

        $recommendations = [];

        foreach ($promoCodes as $promoCode) {
            // Check if user can use this code
            $validation = $promoCode->validateForUser($userId, $subtotal, $isFirstOrder);
            
            if (!$validation['valid']) {
                // Check if it's close to being usable (for suggestions)
                $suggestions = $promoCode->getSuggestionsForUser($userId, $cartItems, $subtotal, $isFirstOrder);
                
                if (!empty($suggestions['suggestions'])) {
                    $recommendations[] = [
                        'promo_code' => $promoCode,
                        'can_use' => false,
                        'discount' => 0,
                        'suggestions' => $suggestions['suggestions'],
                        'score' => $this->calculateSuggestionScore($suggestions['suggestions']),
                    ];
                }
                continue;
            }

            // Calculate potential discount
            $discountResult = $promoCode->calculateDiscount($cartItems, $subtotal);
            $totalSavings = $discountResult['discount_amount'];
            
            if ($discountResult['free_delivery']) {
                $totalSavings += $deliveryFee;
            }

            $recommendations[] = [
                'promo_code' => $promoCode,
                'can_use' => true,
                'discount' => $discountResult['discount_amount'],
                'total_savings' => $totalSavings,
                'free_delivery' => $discountResult['free_delivery'],
                'suggestions' => [],
                'score' => $totalSavings * 100, // Higher score for usable codes
            ];
        }

        // Sort by score (best deals first)
        usort($recommendations, fn($a, $b) => $b['score'] <=> $a['score']);

        // Format for response
        $result = [
            'available' => [],
            'almost_available' => [],
        ];

        foreach (array_slice($recommendations, 0, $limit * 2) as $rec) {
            $item = [
                'code' => $rec['promo_code']->code,
                'type' => $rec['promo_code']->type,
                'display' => $rec['promo_code']->discount_display,
                'discount' => $rec['discount'] ?? 0,
                'total_savings' => $rec['total_savings'] ?? 0,
                'free_delivery' => $rec['free_delivery'] ?? false,
            ];

            if ($rec['can_use']) {
                $result['available'][] = $item;
            } else {
                $item['suggestions'] = $rec['suggestions'];
                $result['almost_available'][] = $item;
            }
        }

        $result['available'] = array_slice($result['available'], 0, $limit);
        $result['almost_available'] = array_slice($result['almost_available'], 0, 3);

        // Add the best recommendation message
        if (!empty($result['available'])) {
            $best = $result['available'][0];
            $result['best_deal'] = [
                'code' => $best['code'],
                'message' => "Use code {$best['code']} to save EGP " . number_format($best['total_savings'], 2),
            ];
        }

        return $result;
    }

    /**
     * Record promo code usage after order is completed
     */
    public function recordUsage(
        PromoCode $promoCode,
        Order $order,
        float $discountAmount
    ): PromoCodeUsage {
        return DB::transaction(function () use ($promoCode, $order, $discountAmount) {
            // Create usage record
            $usage = PromoCodeUsage::create([
                'promo_code_id' => $promoCode->id,
                'user_id' => $order->user_id,
                'order_id' => $order->id,
                'discount_amount' => $discountAmount,
                'order_total' => $order->total,
                'order_number' => $order->order_number,
                'used_at' => now(),
            ]);

            // CONCURRENCY HARDENED (audit I9):
            // Previously this called $promoCode->increment('used_count') on a
            // free-floating model with no row lock. Under burst load (two
            // concurrent checkouts using the same code), `OrderService::
            // finalizePromoUsage` correctly locks the row but this recordUsage
            // path didn't — both could pass the usage_limit check and the
            // limit could be exceeded by 1.
            // Acquire the row lock first, then increment via the locked
            // instance so the read-modify-write is atomic per row.
            $locked = PromoCode::where('id', $promoCode->id)
                ->lockForUpdate()
                ->first();
            if ($locked) {
                $locked->increment('used_count');
            } else {
                // Defensive: promo deleted between calc and record.
                $promoCode->increment('used_count');
            }

            // Clear any cached promo data
            Cache::forget("promo_code_{$promoCode->code}");

            return $usage;
        });
    }

    /**
     * Get analytics for a promo code
     */
    public function getAnalytics(int $promoCodeId, ?string $dateRange = null): array
    {
        $promoCode = PromoCode::with(['usages.user', 'products', 'categories', 'activeBogoRules'])
            ->findOrFail($promoCodeId);

        // Date filter
        $startDate = match ($dateRange) {
            '7days' => now()->subDays(7),
            '30days' => now()->subDays(30),
            '90days' => now()->subDays(90),
            default => null,
        };

        $usagesQuery = $promoCode->usages();
        if ($startDate) {
            $usagesQuery->where('used_at', '>=', $startDate);
        }

        // Statistics
        $statistics = [
            'total_uses' => $usagesQuery->count(),
            'unique_users' => (clone $usagesQuery)->distinct('user_id')->count('user_id'),
            'total_discount' => round((clone $usagesQuery)->sum('discount_amount'), 2),
            'total_order_value' => round((clone $usagesQuery)->sum('order_total'), 2),
            'average_discount' => round((clone $usagesQuery)->avg('discount_amount') ?? 0, 2),
            'average_order_value' => round((clone $usagesQuery)->avg('order_total') ?? 0, 2),
        ];

        // ROI calculation
        if ($statistics['total_order_value'] > 0) {
            $statistics['roi'] = round(
                (($statistics['total_order_value'] - $statistics['total_discount']) / $statistics['total_discount']) * 100,
                1
            );
        } else {
            $statistics['roi'] = 0;
        }

        // Usage timeline
        $timeline = (clone $usagesQuery)
            ->selectRaw('DATE(used_at) as date, COUNT(*) as count, SUM(discount_amount) as total_discount, SUM(order_total) as total_revenue')
            ->groupBy('date')
            ->orderBy('date', 'desc')
            ->limit(30)
            ->get();

        // Top users
        $topUsers = (clone $usagesQuery)
            ->selectRaw('user_id, COUNT(*) as usage_count, SUM(discount_amount) as total_discount, SUM(order_total) as total_spent')
            ->groupBy('user_id')
            ->orderByDesc('usage_count')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                $user = User::find($item->user_id);
                return [
                    'user_id' => $item->user_id,
                    'user_name' => $user?->name ?? 'Unknown',
                    'user_email' => $user?->email ?? '',
                    'usage_count' => $item->usage_count,
                    'total_discount' => round($item->total_discount, 2),
                    'total_spent' => round($item->total_spent, 2),
                ];
            });

        // Hourly distribution (for optimal timing)
        $hourlyDistribution = (clone $usagesQuery)
            ->selectRaw('HOUR(used_at) as hour, COUNT(*) as count')
            ->groupBy('hour')
            ->orderBy('hour')
            ->pluck('count', 'hour')
            ->toArray();

        // Day of week distribution
        $dailyDistribution = (clone $usagesQuery)
            ->selectRaw('DAYOFWEEK(used_at) as day, COUNT(*) as count')
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('count', 'day')
            ->toArray();

        // Recent usages
        $recentUsages = (clone $usagesQuery)
            ->with('user:id,name,email', 'order:id,order_number,total,status')
            ->orderBy('used_at', 'desc')
            ->limit(10)
            ->get();

        return [
            'promo_code' => [
                'id' => $promoCode->id,
                'code' => $promoCode->code,
                'type' => $promoCode->type,
                'applies_to' => $promoCode->applies_to,
                'value' => $promoCode->value,
                'status' => $promoCode->status,
                'display' => $promoCode->discount_display,
                'products_count' => $promoCode->products->count(),
                'categories_count' => $promoCode->categories->count(),
                'bogo_rules_count' => $promoCode->activeBogoRules->count(),
            ],
            'statistics' => $statistics,
            'usage_timeline' => $timeline,
            'top_users' => $topUsers,
            'hourly_distribution' => $hourlyDistribution,
            'daily_distribution' => $dailyDistribution,
            'recent_usages' => $recentUsages,
        ];
    }

    /**
     * Get promo code performance comparison
     */
    public function comparePromoCodes(array $promoCodeIds, ?string $dateRange = null): array
    {
        $startDate = match ($dateRange) {
            '7days' => now()->subDays(7),
            '30days' => now()->subDays(30),
            '90days' => now()->subDays(90),
            default => now()->subDays(30),
        };

        $comparison = [];

        foreach ($promoCodeIds as $id) {
            $promoCode = PromoCode::find($id);
            if (!$promoCode) continue;

            $usages = $promoCode->usages()->where('used_at', '>=', $startDate);

            $comparison[] = [
                'id' => $promoCode->id,
                'code' => $promoCode->code,
                'type' => $promoCode->type,
                'display' => $promoCode->discount_display,
                'status' => $promoCode->status,
                'metrics' => [
                    'uses' => $usages->count(),
                    'unique_users' => (clone $usages)->distinct('user_id')->count('user_id'),
                    'total_discount' => round((clone $usages)->sum('discount_amount'), 2),
                    'total_revenue' => round((clone $usages)->sum('order_total'), 2),
                    'avg_order_value' => round((clone $usages)->avg('order_total') ?? 0, 2),
                ],
            ];
        }

        // Sort by total revenue
        usort($comparison, fn($a, $b) => $b['metrics']['total_revenue'] <=> $a['metrics']['total_revenue']);

        return [
            'period' => $dateRange ?? '30days',
            'start_date' => $startDate->toDateString(),
            'end_date' => now()->toDateString(),
            'comparison' => $comparison,
        ];
    }

    /**
     * Auto-generate promo code suggestions based on data
     */
    public function generateSmartSuggestions(int $userId): array
    {
        $user = User::with('orders')->find($userId);
        if (!$user) return [];

        $suggestions = [];

        // Check if user is new
        $orderCount = $user->orders->count();
        if ($orderCount === 0) {
            $firstOrderCodes = PromoCode::available()
                ->where('first_order_only', true)
                ->get();
            
            foreach ($firstOrderCodes as $code) {
                $suggestions[] = [
                    'code' => $code->code,
                    'reason' => 'Welcome offer for new customers',
                    'display' => $code->discount_display,
                    'priority' => 100,
                ];
            }
        }

        // Check for BOGO deals
        $bogoCodes = PromoCode::available()
            ->where('type', 'bogo')
            ->with('activeBogoRules')
            ->get();

        foreach ($bogoCodes as $code) {
            $suggestions[] = [
                'code' => $code->code,
                'reason' => 'Buy more, save more!',
                'display' => $code->discount_display,
                'priority' => 80,
            ];
        }

        // Check for free delivery deals
        $freeDeliveryCodes = PromoCode::available()
            ->where('type', 'free_delivery')
            ->get();

        foreach ($freeDeliveryCodes as $code) {
            $suggestions[] = [
                'code' => $code->code,
                'reason' => 'Save on delivery',
                'display' => $code->discount_display,
                'priority' => 70,
            ];
        }

        // Sort by priority and limit
        usort($suggestions, fn($a, $b) => $b['priority'] <=> $a['priority']);

        return array_slice($suggestions, 0, 5);
    }

    // ========== HELPERS ==========

    protected function calculateSuggestionScore(array $suggestions): float
    {
        $score = 0;
        foreach ($suggestions as $suggestion) {
            switch ($suggestion['type'] ?? '') {
                case 'add_amount':
                    // Lower amount needed = higher score
                    $score += max(0, 50 - ($suggestion['amount_needed'] ?? 100));
                    break;
                case 'bogo_progress':
                    // Higher progress = higher score
                    $score += ($suggestion['progress']['percentage'] ?? 0) / 2;
                    break;
                default:
                    $score += 10;
            }
        }
        return $score;
    }

    protected function getSuccessMessage(PromoCode $promoCode, float $totalSavings): string
    {
        $formatted = 'EGP ' . number_format($totalSavings, 2);
        
        return match ($promoCode->type) {
            'percentage' => "🎉 {$promoCode->value}% discount applied! You save {$formatted}",
            'fixed_amount' => "🎉 {$formatted} discount applied!",
            'free_delivery' => "🚚 Free delivery applied! You save {$formatted}",
            'bogo' => "🎁 BOGO deal applied! You save {$formatted}",
            default => "✅ Promo code applied! You save {$formatted}",
        };
    }

    protected function success(array $data): array
    {
        return [
            'success' => true,
            'data' => $data,
        ];
    }

    protected function error(string $message, string $code = 'ERROR', array $extra = []): array
    {
        return array_merge([
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $code,
            ],
        ], $extra);
    }
}
