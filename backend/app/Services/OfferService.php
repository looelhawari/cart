<?php

namespace App\Services;

use App\Models\PromoCode;
use App\Models\PromoCodeBogoRule;
use Illuminate\Support\Facades\DB;

class OfferService
{
    public function __construct(private readonly CartService $cartService)
    {
    }

    public function listOffers(array $filters, ?int $userId = null, ?string $sessionId = null): array
    {
        $now = now();

        $query = PromoCode::query()->where('is_active', true);

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (!empty($filters['applies_to'])) {
            $query->where('applies_to', $filters['applies_to']);
        }

        $promos = $query->orderByDesc('created_at')->get();

        if ($promos->isEmpty()) {
            return [
                'offers' => [],
                'meta' => [
                    'count' => 0,
                ],
            ];
        }

        $promoIds = $promos->pluck('id')->all();

        $categoryTargets = DB::table('promo_code_categories')
            ->join('categories', 'categories.id', '=', 'promo_code_categories.category_id')
            ->whereIn('promo_code_id', $promoIds)
            ->select([
                'promo_code_categories.promo_code_id',
                'promo_code_categories.category_id',
                'promo_code_categories.include_subcategories',
                'categories.name_en',
                'categories.name_ar',
            ])
            ->get()
            ->groupBy('promo_code_id');

        $productTargets = DB::table('promo_code_products')
            ->join('products', 'products.barcode', '=', 'promo_code_products.product_id')
            ->whereIn('promo_code_id', $promoIds)
            ->select([
                'promo_code_products.promo_code_id',
                'promo_code_products.product_id',
                'products.name_en',
                'products.name_ar',
                'products.image',
                'products.price',
                'products.sale_price',
            ])
            ->get()
            ->groupBy('promo_code_id');

        $bogoRules = PromoCodeBogoRule::whereIn('promo_code_id', $promoIds)
            ->where('is_active', true)
            ->get()
            ->groupBy('promo_code_id');

        $bogoProductIds = [];
        $bogoCategoryIds = [];
        foreach ($bogoRules as $rules) {
            foreach ($rules as $rule) {
                if ($rule->buy_product_id) {
                    $bogoProductIds[] = $rule->buy_product_id;
                }
                if ($rule->get_product_id) {
                    $bogoProductIds[] = $rule->get_product_id;
                }
                if ($rule->buy_category_id) {
                    $bogoCategoryIds[] = $rule->buy_category_id;
                }
                if ($rule->get_category_id) {
                    $bogoCategoryIds[] = $rule->get_category_id;
                }
            }
        }

        $bogoProductMap = DB::table('products')
            ->whereIn('barcode', array_unique($bogoProductIds))
            ->pluck('name_en', 'barcode');

        $bogoCategoryMap = DB::table('categories')
            ->whereIn('id', array_unique($bogoCategoryIds))
            ->pluck('name_en', 'id');

        $cart = null;
        $cartTotals = null;
        if ($userId) {
            $cart = $this->cartService->getCart($userId, $sessionId);
            $cartTotals = $this->cartService->calculateTotals($cart);
        }

        $offers = [];
        foreach ($promos as $promo) {
            $status = $this->computeStatus($promo, $now);

            $isEndingSoon = false;
            if ($promo->valid_until && $promo->valid_until->greaterThanOrEqualTo($now)) {
                $isEndingSoon = $promo->valid_until->diffInHours($now) <= 48;
            }

            $targets = $this->buildTargets(
                $promo->id,
                $categoryTargets,
                $productTargets,
                $bogoRules,
                $bogoProductMap,
                $bogoCategoryMap
            );

            $title = $this->buildTitle($promo, $targets);
            $subtitle = $this->buildSubtitle($promo, $status, $now);
            $badge = $this->buildBadge($promo);
            $restrictions = $this->buildRestrictions($promo);

            $eligibility = $this->buildEligibility($promo, $status, $userId, $cart, $cartTotals);

            $offers[] = [
                'id' => $promo->id,
                'code' => $promo->code,
                'type' => $promo->type,
                'applies_to' => $promo->applies_to,
                'value' => (float) $promo->value,
                'minimum_order' => (float) $promo->minimum_order,
                'maximum_discount' => $promo->maximum_discount ? (float) $promo->maximum_discount : null,
                'usage_limit' => $promo->usage_limit,
                'usage_per_user' => $promo->usage_per_user,
                'used_count' => $promo->used_count,
                'valid_from' => $promo->valid_from,
                'valid_until' => $promo->valid_until,
                'valid_until_ts' => $promo->valid_until?->timestamp,
                'created_at_ts' => $promo->created_at?->timestamp,
                'is_active' => (bool) $promo->is_active,
                'first_order_only' => (bool) $promo->first_order_only,
                'status' => $status,
                'ending_soon' => $isEndingSoon,
                'badge' => $badge,
                'title' => $title,
                'subtitle' => $subtitle,
                'restrictions' => $restrictions,
                'targets' => $targets,
                'eligibility' => $eligibility,
            ];
        }

        $offers = $this->applyPostFilters($offers, $filters);

        foreach ($offers as &$offer) {
            unset($offer['valid_until_ts'], $offer['created_at_ts']);
        }
        unset($offer);

        return [
            'offers' => $offers,
            'meta' => [
                'count' => count($offers),
            ],
        ];
    }

    public function getSummary(?int $userId = null, ?string $sessionId = null): array
    {
        $filters = [];
        $result = $this->listOffers($filters, $userId, $sessionId);
        $offers = $result['offers'];

        $activeCount = 0;
        $endingSoonCount = 0;
        $eligibleCount = 0;
        $maxPercentage = null;
        $maxValue = null;

        foreach ($offers as $offer) {
            if ($offer['status'] === 'active') {
                $activeCount++;
                if ($offer['type'] === 'percentage') {
                    $maxPercentage = max($maxPercentage ?? 0, (int) round($offer['value']));
                }
                if ($offer['type'] === 'fixed_amount') {
                    $maxValue = max($maxValue ?? 0, (int) round($offer['value']));
                }
            }
            if ($offer['ending_soon']) {
                $endingSoonCount++;
            }
            if (in_array($offer['eligibility']['state'], ['valid', 'pending'], true)) {
                $eligibleCount++;
            }
        }

        return [
            'active_count' => $activeCount,
            'ending_soon_count' => $endingSoonCount,
            'eligible_count' => $eligibleCount,
            'has_offers' => $activeCount > 0,
            'max_percentage' => $maxPercentage,
            'max_value' => $maxValue,
        ];
    }

    private function computeStatus(PromoCode $promo, $now): string
    {
        if ($promo->usage_limit && $promo->used_count >= $promo->usage_limit) {
            return 'ended';
        }

        if ($promo->valid_from && $promo->valid_from->greaterThan($now)) {
            return 'upcoming';
        }

        if ($promo->valid_until && $promo->valid_until->lessThan($now)) {
            return 'expired';
        }

        return 'active';
    }

    private function buildBadge(PromoCode $promo): string
    {
        if ($promo->type === 'bogo') {
            return 'BOGO';
        }

        if ($promo->type === 'free_delivery') {
            return 'Free delivery';
        }

        return match ($promo->applies_to) {
            'category' => 'Category',
            'product' => 'Product',
            default => 'Order',
        };
    }

    private function buildTitle(PromoCode $promo, array $targets): string
    {
        if ($promo->type === 'free_delivery') {
            return 'Free delivery on your order';
        }

        if ($promo->type === 'bogo') {
            $rule = $targets['bogo_rules'][0] ?? null;
            if ($rule) {
                $buyLabel = $rule['buy_label'] ?? 'selected items';
                $getLabel = $rule['get_label'] ?? 'selected items';
                return "Buy {$rule['buy_qty']} {$buyLabel}, get {$rule['get_qty']} {$getLabel}";
            }
            return 'Buy one, get one offer';
        }

        $valueLabel = $promo->type === 'percentage'
            ? (int) $promo->value . '% off'
            : 'EGP ' . number_format((float) $promo->value, 0) . ' off';

        if ($promo->applies_to === 'category') {
            $category = $targets['categories'][0]['name_en'] ?? null;
            return $category ? "{$valueLabel} {$category}" : "{$valueLabel} selected categories";
        }

        if ($promo->applies_to === 'product') {
            $product = $targets['products'][0]['name_en'] ?? null;
            return $product ? "{$valueLabel} {$product}" : "{$valueLabel} selected products";
        }

        return "{$valueLabel} your order";
    }

    private function buildSubtitle(PromoCode $promo, string $status, $now): string
    {
        if ($status === 'upcoming' && $promo->valid_from) {
            return 'Starts ' . $promo->valid_from->format('M d');
        }

        if ($promo->valid_until) {
            return 'Valid until ' . $promo->valid_until->format('M d');
        }

        return 'Limited time offer';
    }

    private function buildRestrictions(PromoCode $promo): array
    {
        $restrictions = [];

        if ($promo->minimum_order && $promo->minimum_order > 0) {
            $restrictions[] = 'Min order: EGP ' . number_format((float) $promo->minimum_order, 0);
        }

        if ($promo->maximum_discount) {
            $restrictions[] = 'Max discount: EGP ' . number_format((float) $promo->maximum_discount, 0);
        }

        if ($promo->usage_per_user) {
            $restrictions[] = $promo->usage_per_user . ' use per user';
        }

        if ($promo->usage_limit) {
            $restrictions[] = 'Total uses: ' . $promo->usage_limit;
        }

        if ($promo->first_order_only) {
            $restrictions[] = 'First paid order only';
        }

        return $restrictions;
    }

    private function buildTargets(
        int $promoId,
        $categoryTargets,
        $productTargets,
        $bogoRules,
        $bogoProductMap,
        $bogoCategoryMap
    ): array {
        $categories = [];
        if (isset($categoryTargets[$promoId])) {
            foreach ($categoryTargets[$promoId] as $row) {
                $categories[] = [
                    'id' => $row->category_id,
                    'name_en' => $row->name_en,
                    'name_ar' => $row->name_ar,
                    'include_subcategories' => (bool) $row->include_subcategories,
                ];
            }
        }

        $products = [];
        if (isset($productTargets[$promoId])) {
            foreach ($productTargets[$promoId] as $row) {
                $products[] = [
                    'id' => $row->product_id,
                    'name_en' => $row->name_en,
                    'name_ar' => $row->name_ar,
                    'image' => $row->image,
                    'price' => (float) $row->price,
                    'sale_price' => $row->sale_price ? (float) $row->sale_price : null,
                ];
            }
        }

        $rules = [];
        if (isset($bogoRules[$promoId])) {
            foreach ($bogoRules[$promoId] as $rule) {
                $rules[] = [
                    'id' => $rule->id,
                    'buy_scope' => $rule->buy_scope,
                    'buy_product_id' => $rule->buy_product_id,
                    'buy_category_id' => $rule->buy_category_id,
                    'buy_qty' => $rule->buy_qty,
                    'buy_label' => $rule->buy_scope === 'product'
                        ? ($bogoProductMap[$rule->buy_product_id] ?? 'selected products')
                        : ($bogoCategoryMap[$rule->buy_category_id] ?? 'selected categories'),
                    'get_scope' => $rule->get_scope,
                    'get_product_id' => $rule->get_product_id,
                    'get_category_id' => $rule->get_category_id,
                    'get_qty' => $rule->get_qty,
                    'get_discount_type' => $rule->get_discount_type,
                    'get_discount_value' => (float) $rule->get_discount_value,
                    'get_label' => $rule->get_scope === 'product'
                        ? ($bogoProductMap[$rule->get_product_id] ?? 'selected products')
                        : ($bogoCategoryMap[$rule->get_category_id] ?? 'selected categories'),
                    'max_applications_per_order' => $rule->max_applications_per_order,
                ];
            }
        }

        return [
            'categories' => $categories,
            'products' => $products,
            'bogo_rules' => $rules,
        ];
    }

    private function buildEligibility(
        PromoCode $promo,
        string $status,
        ?int $userId,
        $cart,
        ?array $cartTotals
    ): array {
        if ($status === 'expired') {
            return [
                'state' => 'invalid',
                'reason' => 'EXPIRED',
                'message' => 'Offer expired',
                'can_apply' => false,
                'requires_login' => false,
                'user_usage_count' => null,
            ];
        }

        if ($status === 'upcoming') {
            return [
                'state' => 'invalid',
                'reason' => 'NOT_STARTED',
                'message' => 'Offer not started yet',
                'can_apply' => false,
                'requires_login' => false,
                'user_usage_count' => null,
            ];
        }

        if ($status === 'ended') {
            return [
                'state' => 'invalid',
                'reason' => 'USAGE_LIMIT_REACHED',
                'message' => 'Offer usage limit reached',
                'can_apply' => false,
                'requires_login' => false,
                'user_usage_count' => null,
            ];
        }

        if (!$userId) {
            return [
                'state' => 'login_required',
                'reason' => 'LOGIN_REQUIRED',
                'message' => 'Login to apply this offer',
                'can_apply' => false,
                'requires_login' => true,
                'user_usage_count' => null,
            ];
        }

        if (!$cart || !$cartTotals) {
            return [
                'state' => 'invalid',
                'reason' => 'NOT_APPLICABLE_TO_CART',
                'message' => 'Add items to check eligibility',
                'can_apply' => false,
                'requires_login' => false,
                'user_usage_count' => null,
            ];
        }

        $evaluation = $this->cartService->evaluatePromoForCart(
            $promo,
            $cart,
            $userId,
            $cartTotals['subtotal'],
            $cartTotals['delivery_fee']
        );

        $state = $evaluation['validation_state'];
        $reason = $evaluation['invalid_reason'] ?? null;

        return [
            'state' => $state,
            'reason' => $reason,
            'message' => $state === 'invalid'
                ? $this->cartService->promoReasonMessage($reason)
                : ($state === 'pending' ? $this->cartService->promoReasonMessage($reason) : 'Eligible'),
            'can_apply' => in_array($state, ['valid', 'pending'], true),
            'requires_login' => false,
            'user_usage_count' => $this->getUserUsageCount($promo->id, $userId),
        ];
    }

    private function getUserUsageCount(int $promoId, int $userId): int
    {
        return DB::table('promo_code_usage')
            ->where('promo_code_id', $promoId)
            ->where('user_id', $userId)
            ->count();
    }

    private function applyPostFilters(array $offers, array $filters): array
    {
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $status = $filters['status'];
            $offers = array_values(array_filter($offers, fn ($offer) => $offer['status'] === $status));
        }

        if (!empty($filters['ending_soon'])) {
            $offers = array_values(array_filter($offers, fn ($offer) => $offer['ending_soon']));
        }

        if (!empty($filters['for_you'])) {
            $offers = array_values(array_filter($offers, function ($offer) {
                return in_array($offer['eligibility']['state'], ['valid', 'pending'], true);
            }));
        }

        if (!empty($filters['search'])) {
            $search = strtolower($filters['search']);
            $offers = array_values(array_filter($offers, function ($offer) use ($search) {
                $haystack = strtolower(
                    $offer['code'] . ' ' .
                    $offer['title'] . ' ' .
                    implode(' ', $offer['restrictions'])
                );
                foreach ($offer['targets']['categories'] as $category) {
                    $haystack .= ' ' . strtolower($category['name_en'] ?? '');
                    $haystack .= ' ' . strtolower($category['name_ar'] ?? '');
                }
                foreach ($offer['targets']['products'] as $product) {
                    $haystack .= ' ' . strtolower($product['name_en'] ?? '');
                    $haystack .= ' ' . strtolower($product['name_ar'] ?? '');
                }
                return str_contains($haystack, $search);
            }));
        }

        $sort = $filters['sort'] ?? 'recommended';
        usort($offers, function ($a, $b) use ($sort) {
            return match ($sort) {
                'ending_soon' => ($a['valid_until_ts'] ?? PHP_INT_MAX) <=> ($b['valid_until_ts'] ?? PHP_INT_MAX),
                'biggest_savings' => ($b['value'] ?? 0) <=> ($a['value'] ?? 0),
                'newest' => ($b['created_at_ts'] ?? 0) <=> ($a['created_at_ts'] ?? 0),
                default => ($a['status'] === 'active' ? 0 : 1) <=> ($b['status'] === 'active' ? 0 : 1),
            };
        });

        return $offers;
    }
}
