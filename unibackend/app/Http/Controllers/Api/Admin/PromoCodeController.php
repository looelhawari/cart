<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PromoCode;
use App\Models\PromoCodeUsage;
use App\Models\PromoCodeBogoRule;
use App\Models\Product;
use App\Models\Category;
use App\Services\PromoCodeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PromoCodeController extends Controller
{
    protected PromoCodeService $promoCodeService;

    public function __construct(PromoCodeService $promoCodeService)
    {
        $this->promoCodeService = $promoCodeService;
    }

    /**
     * Get all promo codes with full details
     */
    public function index(Request $request): JsonResponse
    {
        $query = PromoCode::with(['products:barcode,name_en,name_ar', 'categories:id,name_en,name_ar', 'activeBogoRules']);

        // Filters
        if ($request->filled('status')) {
            switch ($request->status) {
                case 'active':
                    $query->active();
                    break;
                case 'inactive':
                    $query->where('is_active', false);
                    break;
                case 'expired':
                    $query->where('valid_until', '<', now());
                    break;
                case 'scheduled':
                    $query->where('valid_from', '>', now());
                    break;
            }
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('applies_to')) {
            $query->where('applies_to', $request->applies_to);
        }

        if ($request->filled('search')) {
            $query->where('code', 'like', '%' . $request->search . '%');
        }

        $perPage = min($request->get('per_page', 20), 100);
        $promoCodes = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $promoCodes,
        ]);
    }

    /**
     * Get a single promo code with full details
     */
    public function show($id): JsonResponse
    {
        $promoCode = PromoCode::with([
            'products:barcode,name_en,name_ar,price,image_url',
            'categories:id,name_en,name_ar',
            'activeBogoRules',
        ])->findOrFail($id);

        // Add statistics
        $promoCode->statistics = $promoCode->getStatistics();

        return response()->json([
            'success' => true,
            'data' => $promoCode,
        ]);
    }

    /**
     * Create a new promo code
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:promo_codes,code'],
            'type' => ['required', Rule::in(['percentage', 'fixed_amount', 'free_delivery', 'bogo'])],
            'applies_to' => ['required', Rule::in(['order', 'product', 'category'])],
            'value' => ['required_unless:type,bogo,free_delivery', 'numeric', 'min:0'],
            'minimum_order' => ['nullable', 'numeric', 'min:0'],
            'maximum_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'usage_per_user' => ['nullable', 'integer', 'min:1'],
            'first_order_only' => ['boolean'],
            'valid_from' => ['required', 'date'],
            'valid_until' => ['required', 'date', 'after:valid_from'],
            'is_active' => ['boolean'],
            // Related data
            'product_ids' => ['array'],
            'product_ids.*' => ['exists:products,id'],
            'category_data' => ['array'],
            'category_data.*.category_id' => ['exists:categories,id'],
            'category_data.*.include_subcategories' => ['boolean'],
            // BOGO rules
            'bogo_rules' => ['array'],
            'bogo_rules.*.buy_scope' => [Rule::in(['any', 'product', 'category'])],
            'bogo_rules.*.buy_product_id' => ['nullable', 'exists:products,id'],
            'bogo_rules.*.buy_category_id' => ['nullable', 'exists:categories,id'],
            'bogo_rules.*.buy_qty' => ['required_with:bogo_rules', 'integer', 'min:1'],
            'bogo_rules.*.get_scope' => [Rule::in(['same', 'product', 'category'])],
            'bogo_rules.*.get_product_id' => ['nullable', 'exists:products,id'],
            'bogo_rules.*.get_category_id' => ['nullable', 'exists:categories,id'],
            'bogo_rules.*.get_qty' => ['required_with:bogo_rules', 'integer', 'min:1'],
            'bogo_rules.*.get_discount_type' => [Rule::in(['free', 'percentage', 'fixed'])],
            'bogo_rules.*.get_discount_value' => ['nullable', 'numeric', 'min:0'],
            'bogo_rules.*.max_applications_per_order' => ['nullable', 'integer', 'min:1'],
        ]);

        return DB::transaction(function () use ($validated) {
            // Create promo code
            $promoCode = PromoCode::create([
                'code' => strtoupper(trim($validated['code'])),
                'type' => $validated['type'],
                'applies_to' => $validated['applies_to'],
                'value' => $validated['value'] ?? 0,
                'minimum_order' => $validated['minimum_order'] ?? null,
                'maximum_discount' => $validated['maximum_discount'] ?? null,
                'usage_limit' => $validated['usage_limit'] ?? null,
                'usage_per_user' => $validated['usage_per_user'] ?? null,
                'first_order_only' => $validated['first_order_only'] ?? false,
                'valid_from' => $validated['valid_from'],
                'valid_until' => $validated['valid_until'],
                'is_active' => $validated['is_active'] ?? true,
            ]);

            // Attach products
            if (!empty($validated['product_ids'])) {
                $promoCode->products()->attach($validated['product_ids']);
            }

            // Attach categories with subcategory flag
            if (!empty($validated['category_data'])) {
                foreach ($validated['category_data'] as $cat) {
                    DB::table('promo_code_categories')->insert([
                        'promo_code_id' => $promoCode->id,
                        'category_id' => $cat['category_id'],
                        'include_subcategories' => $cat['include_subcategories'] ?? false,
                    ]);
                }
            }

            // Create BOGO rules
            if (!empty($validated['bogo_rules'])) {
                foreach ($validated['bogo_rules'] as $rule) {
                    PromoCodeBogoRule::create([
                        'promo_code_id' => $promoCode->id,
                        'buy_scope' => $rule['buy_scope'] ?? 'any',
                        'buy_product_id' => $rule['buy_product_id'] ?? null,
                        'buy_category_id' => $rule['buy_category_id'] ?? null,
                        'buy_include_subcategories' => $rule['buy_include_subcategories'] ?? false,
                        'buy_qty' => $rule['buy_qty'],
                        'get_scope' => $rule['get_scope'] ?? 'same',
                        'get_product_id' => $rule['get_product_id'] ?? null,
                        'get_category_id' => $rule['get_category_id'] ?? null,
                        'get_include_subcategories' => $rule['get_include_subcategories'] ?? false,
                        'get_qty' => $rule['get_qty'],
                        'get_discount_type' => $rule['get_discount_type'] ?? 'free',
                        'get_discount_value' => $rule['get_discount_value'] ?? 0,
                        'max_applications_per_order' => $rule['max_applications_per_order'] ?? null,
                        'is_active' => true,
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Promo code created successfully',
                'data' => $promoCode->load(['products', 'categories', 'activeBogoRules']),
            ], 201);
        });
    }

    /**
     * Update a promo code
     */
    public function update(Request $request, $id): JsonResponse
    {
        $promoCode = PromoCode::findOrFail($id);

        $validated = $request->validate([
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('promo_codes', 'code')->ignore($id)],
            'type' => ['sometimes', Rule::in(['percentage', 'fixed_amount', 'free_delivery', 'bogo'])],
            'applies_to' => ['sometimes', Rule::in(['order', 'product', 'category'])],
            'value' => ['nullable', 'numeric', 'min:0'],
            'minimum_order' => ['nullable', 'numeric', 'min:0'],
            'maximum_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'usage_per_user' => ['nullable', 'integer', 'min:1'],
            'first_order_only' => ['boolean'],
            'valid_from' => ['sometimes', 'date'],
            'valid_until' => ['sometimes', 'date'],
            'is_active' => ['boolean'],
            'product_ids' => ['array'],
            'product_ids.*' => ['exists:products,id'],
            'category_data' => ['array'],
            'bogo_rules' => ['array'],
        ]);

        return DB::transaction(function () use ($promoCode, $validated, $request) {
            // Update main fields
            $promoCode->fill($validated);
            if (isset($validated['code'])) {
                $promoCode->code = strtoupper(trim($validated['code']));
            }
            $promoCode->save();

            // Update products
            if ($request->has('product_ids')) {
                $promoCode->products()->sync($validated['product_ids'] ?? []);
            }

            // Update categories
            if ($request->has('category_data')) {
                DB::table('promo_code_categories')->where('promo_code_id', $promoCode->id)->delete();
                foreach ($validated['category_data'] ?? [] as $cat) {
                    DB::table('promo_code_categories')->insert([
                        'promo_code_id' => $promoCode->id,
                        'category_id' => $cat['category_id'],
                        'include_subcategories' => $cat['include_subcategories'] ?? false,
                    ]);
                }
            }

            // Update BOGO rules
            if ($request->has('bogo_rules')) {
                $promoCode->bogoRules()->delete();
                foreach ($validated['bogo_rules'] ?? [] as $rule) {
                    PromoCodeBogoRule::create([
                        'promo_code_id' => $promoCode->id,
                        'buy_scope' => $rule['buy_scope'] ?? 'any',
                        'buy_product_id' => $rule['buy_product_id'] ?? null,
                        'buy_category_id' => $rule['buy_category_id'] ?? null,
                        'buy_include_subcategories' => $rule['buy_include_subcategories'] ?? false,
                        'buy_qty' => $rule['buy_qty'] ?? 1,
                        'get_scope' => $rule['get_scope'] ?? 'same',
                        'get_product_id' => $rule['get_product_id'] ?? null,
                        'get_category_id' => $rule['get_category_id'] ?? null,
                        'get_include_subcategories' => $rule['get_include_subcategories'] ?? false,
                        'get_qty' => $rule['get_qty'] ?? 1,
                        'get_discount_type' => $rule['get_discount_type'] ?? 'free',
                        'get_discount_value' => $rule['get_discount_value'] ?? 0,
                        'max_applications_per_order' => $rule['max_applications_per_order'] ?? null,
                        'is_active' => $rule['is_active'] ?? true,
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Promo code updated successfully',
                'data' => $promoCode->fresh(['products', 'categories', 'activeBogoRules']),
            ]);
        });
    }

    /**
     * Delete a promo code
     */
    public function destroy($id): JsonResponse
    {
        $promoCode = PromoCode::findOrFail($id);

        // Check if it has been used
        $usageCount = $promoCode->usages()->count();
        
        if ($usageCount > 0) {
            // Soft delete by deactivating
            $promoCode->update(['is_active' => false]);
            return response()->json([
                'success' => true,
                'message' => "Promo code deactivated (has {$usageCount} usage records)",
            ]);
        }

        // Hard delete
        DB::transaction(function () use ($promoCode) {
            $promoCode->products()->detach();
            DB::table('promo_code_categories')->where('promo_code_id', $promoCode->id)->delete();
            $promoCode->bogoRules()->delete();
            $promoCode->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Promo code deleted successfully',
        ]);
    }

    /**
     * Get promo code analytics and usage statistics
     */
    public function analytics(Request $request, $id): JsonResponse
    {
        $dateRange = $request->get('date_range', '30days');
        $analytics = $this->promoCodeService->getAnalytics($id, $dateRange);

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }

    /**
     * Compare multiple promo codes
     */
    public function compare(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => ['required', 'array', 'min:2', 'max:10'],
            'ids.*' => ['exists:promo_codes,id'],
            'date_range' => ['nullable', Rule::in(['7days', '30days', '90days'])],
        ]);

        $comparison = $this->promoCodeService->comparePromoCodes(
            $request->ids,
            $request->date_range
        );

        return response()->json([
            'success' => true,
            'data' => $comparison,
        ]);
    }

    /**
     * Get promo code usage history
     */
    public function usageHistory(Request $request, $id): JsonResponse
    {
        $perPage = min($request->get('per_page', 20), 100);

        $query = PromoCodeUsage::where('promo_code_id', $id)
            ->with(['user:id,first_name,last_name,email,phone', 'order:id,order_number,total,status,created_at']);

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('used_at', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('used_at', '<=', $request->to_date);
        }

        $usages = $query->orderBy('used_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $usages,
        ]);
    }

    /**
     * Get user's usage of a specific promo code
     */
    public function userUsage(Request $request, $id, $userId): JsonResponse
    {
        $promoCode = PromoCode::findOrFail($id);
        
        $usages = PromoCodeUsage::where('promo_code_id', $id)
            ->where('user_id', $userId)
            ->with('order:id,order_number,total,status,created_at')
            ->orderBy('used_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'user_id' => $userId,
                'promo_code' => $promoCode->code,
                'usage_count' => $usages->count(),
                'usage_limit' => $promoCode->usage_per_user,
                'remaining_uses' => $promoCode->getRemainingUsesForUser($userId),
                'can_use' => !$promoCode->userHasReachedLimit($userId),
                'total_discount' => $usages->sum('discount_amount'),
                'usages' => $usages,
            ],
        ]);
    }

    /**
     * Get all users who used a promo code
     */
    public function users(Request $request, $id): JsonResponse
    {
        $perPage = min($request->get('per_page', 20), 100);

        $users = PromoCodeUsage::where('promo_code_id', $id)
            ->select('user_id', 
                DB::raw('COUNT(*) as usage_count'), 
                DB::raw('SUM(discount_amount) as total_discount'),
                DB::raw('SUM(order_total) as total_spent'),
                DB::raw('MAX(used_at) as last_used'))
            ->groupBy('user_id')
            ->with('user:id,first_name,last_name,email,phone')
            ->orderBy('usage_count', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * Duplicate a promo code
     */
    public function duplicate($id): JsonResponse
    {
        $original = PromoCode::with(['products', 'categories', 'bogoRules'])->findOrFail($id);

        return DB::transaction(function () use ($original) {
            // Generate new code
            $newCode = $original->code . '_COPY_' . strtoupper(substr(uniqid(), -4));

            $newPromoCode = $original->replicate();
            $newPromoCode->code = $newCode;
            $newPromoCode->used_count = 0;
            $newPromoCode->is_active = false; // Start as inactive
            $newPromoCode->save();

            // Copy products
            $newPromoCode->products()->attach($original->products->pluck('id'));

            // Copy categories
            foreach ($original->categories as $category) {
                DB::table('promo_code_categories')->insert([
                    'promo_code_id' => $newPromoCode->id,
                    'category_id' => $category->id,
                    'include_subcategories' => $category->pivot->include_subcategories,
                ]);
            }

            // Copy BOGO rules
            foreach ($original->bogoRules as $rule) {
                $newRule = $rule->replicate();
                $newRule->promo_code_id = $newPromoCode->id;
                $newRule->save();
            }

            return response()->json([
                'success' => true,
                'message' => 'Promo code duplicated successfully',
                'data' => $newPromoCode->load(['products', 'categories', 'activeBogoRules']),
            ]);
        });
    }

    /**
     * Get available products for promo code targeting
     */
    public function getProducts(Request $request): JsonResponse
    {
        $query = Product::where('is_active', true)
            ->select('barcode', 'name_en', 'name_ar', 'price', 'category_id', 'image');

        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('name_en', 'like', '%' . $request->search . '%')
                  ->orWhere('name_ar', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $products = $query->limit(100)->get()->map(function($product) {
            return [
                'id' => $product->barcode,
                'barcode' => $product->barcode,
                'name' => $product->name_en,
                'name_en' => $product->name_en,
                'name_ar' => $product->name_ar,
                'price' => $product->price,
                'category_id' => $product->category_id,
                'image' => $product->image,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    /**
     * Get categories for promo code targeting
     */
    public function getCategories(): JsonResponse
    {
        $categories = Category::with('children:id,name_en,name_ar,parent_id')
            ->whereNull('parent_id')
            ->select('id', 'name_en', 'name_ar')
            ->get()
            ->map(function($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name_en,
                    'name_en' => $category->name_en,
                    'name_ar' => $category->name_ar,
                    'children' => $category->children->map(function($child) {
                        return [
                            'id' => $child->id,
                            'name' => $child->name_en,
                            'name_en' => $child->name_en,
                            'name_ar' => $child->name_ar,
                        ];
                    }),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    /**
     * Bulk update promo codes status
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:promo_codes,id'],
            'is_active' => ['required', 'boolean'],
        ]);

        $updated = PromoCode::whereIn('id', $request->ids)
            ->update(['is_active' => $request->is_active]);

        return response()->json([
            'success' => true,
            'message' => "{$updated} promo codes updated",
        ]);
    }

    /**
     * Export promo codes to CSV
     */
    public function export(Request $request): JsonResponse
    {
        $promoCodes = PromoCode::with(['products', 'categories'])->get();

        $data = $promoCodes->map(function ($code) {
            return [
                'code' => $code->code,
                'type' => $code->type,
                'applies_to' => $code->applies_to,
                'value' => $code->value,
                'minimum_order' => $code->minimum_order,
                'maximum_discount' => $code->maximum_discount,
                'usage_limit' => $code->usage_limit,
                'usage_per_user' => $code->usage_per_user,
                'used_count' => $code->used_count,
                'first_order_only' => $code->first_order_only ? 'Yes' : 'No',
                'valid_from' => $code->valid_from?->toDateString(),
                'valid_until' => $code->valid_until?->toDateString(),
                'status' => $code->status,
                'products' => $code->products->pluck('name')->join(', '),
                'categories' => $code->categories->pluck('name')->join(', '),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
