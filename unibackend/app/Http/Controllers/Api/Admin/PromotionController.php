<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use App\Services\PromotionService;
use App\Services\CloudinaryService;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class PromotionController extends Controller
{
    protected PromotionService $promotionService;
    protected CloudinaryService $cloudinaryService;
    protected PushNotificationService $pushNotificationService;

    public function __construct(
        PromotionService $promotionService,
        CloudinaryService $cloudinaryService,
        PushNotificationService $pushNotificationService
    ) {
        $this->promotionService = $promotionService;
        $this->cloudinaryService = $cloudinaryService;
        $this->pushNotificationService = $pushNotificationService;
    }

    /**
     * Invalidate promotion + product caches so the storefront reflects a
     * promotion change immediately. Promotions rewrite product sale_price,
     * so the product list/flash-deals/featured caches must clear too.
     */
    private function flushPromotionCaches($promotionId = null): void
    {
        \App\Http\Controllers\Api\PromotionController::clearCache($promotionId);
        \App\Http\Controllers\Api\ProductController::clearCache();
        \App\Http\Controllers\Api\Admin\AnalyticsController::clearCache();
    }

    /**
     * Get all promotions (admin)
     */
    public function index(Request $request)
    {
        try {
            $query = Promotion::with(['creator', 'categories', 'products'])->orderBy('created_at', 'desc');

            if ($request->has('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            if ($request->has('is_featured')) {
                $query->where('is_featured', $request->boolean('is_featured'));
            }

            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('title_ar', 'like', "%{$search}%");
                });
            }

            $promotions = $request->has('per_page')
                ? $query->paginate($request->input('per_page', 20))
                : $query->get();

            return response()->json([
                'success' => true,
                'data' => $promotions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch promotions',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create new promotion
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'title_ar' => 'required|string|max:255',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'discount_type' => 'required|in:percentage,fixed,buy_x_get_y',
            'discount_value' => 'required|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'applies_to' => 'required|in:all,category,products',
            'min_purchase' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'terms_conditions' => 'nullable|string',
            'terms_conditions_ar' => 'nullable|string',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'exists:categories,id',
            'product_barcodes' => 'nullable|array',
            'product_barcodes.*' => 'exists:products,barcode',
            'image' => 'nullable|image|max:5120', // 5MB
            'banner_image' => 'nullable|image|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $promotionData = $request->except(['category_ids', 'product_barcodes', 'image', 'banner_image']);
            $promotionData['created_by'] = auth()->id();

            $promotion = Promotion::create($promotionData);

            // Handle image uploads
            if ($request->hasFile('image')) {
                $result = $this->cloudinaryService->uploadImage(
                    $request->file('image'),
                    'promotions'
                );
                $promotion->update(['image_url' => $result['url']]);
            }

            if ($request->hasFile('banner_image')) {
                $result = $this->cloudinaryService->uploadImage(
                    $request->file('banner_image'),
                    'promotions/banners'
                );
                $promotion->update(['banner_image_url' => $result['url']]);
            }

            // Attach categories
            if ($request->input('applies_to') === 'category') {
                $categoryIds = array_filter((array) $request->input('category_ids', []), fn($v) => !empty($v));
                if (!empty($categoryIds)) {
                    $promotion->categories()->attach($categoryIds);
                }
            }

            // Attach products
            if ($request->input('applies_to') === 'products') {
                $productBarcodes = array_filter((array) $request->input('product_barcodes', []), fn($v) => !empty($v));
                if (!empty($productBarcodes)) {
                    $promotion->products()->attach($productBarcodes);
                }
            }

            // Apply promotion to products if active
            if ($promotion->is_currently_active) {
                $this->promotionService->applyPromotionToProducts($promotion);

                // Send push notification for new active promotion
                if ($request->boolean('send_notification', false)) {
                    $this->pushNotificationService->sendPromotionNotification(
                        "🎉 {$promotion->title}",
                        $promotion->description ?? "Check out our latest offer!",
                        $promotion->id,
                        "🎉 {$promotion->title_ar}",
                        $promotion->description_ar ?? "تحقق من أحدث عروضنا!",
                        $promotion->image_url
                    );
                }
            }

            DB::commit();

            $this->flushPromotionCaches($promotion->id);

            return response()->json([
                'success' => true,
                'message' => 'Promotion created successfully',
                'data' => $promotion->load(['categories', 'products']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create promotion',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single promotion
     */
    public function show($id)
    {
        try {
            $promotion = Promotion::with(['creator', 'categories', 'products'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $promotion,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Promotion not found',
            ], 404);
        }
    }

    /**
     * Update promotion
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'title_ar' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'discount_type' => 'sometimes|required|in:percentage,fixed,buy_x_get_y',
            'discount_value' => 'sometimes|required|numeric|min:0',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'applies_to' => 'sometimes|required|in:all,category,products',
            'min_purchase' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'terms_conditions' => 'nullable|string',
            'terms_conditions_ar' => 'nullable|string',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'exists:categories,id',
            'product_barcodes' => 'nullable|array',
            'product_barcodes.*' => 'exists:products,barcode',
            'image' => 'nullable|image|max:5120',
            'banner_image' => 'nullable|image|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $promotion = Promotion::findOrFail($id);
            DB::beginTransaction();

            $wasActive = $promotion->is_currently_active;

            // SECURITY HARDENED (audit I4 — validation bypass):
            // Previously used $request->except(...) which leaks unvalidated
            // request keys straight into Promotion::update(). Because
            // Promotion::$fillable contains `created_by`, any admin could
            // post `?created_by=<other_admin_id>` and rewrite the authorship
            // / audit trail. Use $validator->validated() and strip the
            // immutable audit columns explicitly.
            $payload = $validator->validated();
            unset(
                $payload['category_ids'],
                $payload['product_barcodes'],
                $payload['image'],
                $payload['banner_image'],
                $payload['created_by'],   // audit-trail field — must never be client-set on update
                $payload['id'],
                $payload['created_at'],
                $payload['updated_at'],
            );
            $promotion->update($payload);

            // Handle image uploads
            if ($request->hasFile('image')) {
                // Delete old image
                if ($promotion->image_url) {
                    $this->cloudinaryService->deleteImage($promotion->image_url);
                }

                $result = $this->cloudinaryService->uploadImage(
                    $request->file('image'),
                    'promotions'
                );
                $promotion->update(['image_url' => $result['url']]);
            }

            if ($request->hasFile('banner_image')) {
                // Delete old banner
                if ($promotion->banner_image_url) {
                    $this->cloudinaryService->deleteImage($promotion->banner_image_url);
                }

                $result = $this->cloudinaryService->uploadImage(
                    $request->file('banner_image'),
                    'promotions/banners'
                );
                $promotion->update(['banner_image_url' => $result['url']]);
            }

            // Update categories — always sync when applies_to is provided
            $appliesTo = $request->input('applies_to', $promotion->applies_to);
            if ($appliesTo === 'category') {
                $categoryIds = array_filter((array) $request->input('category_ids', []), fn($v) => !empty($v));
                $promotion->categories()->sync($categoryIds);
                // Clear products if scope changed to category
                $promotion->products()->sync([]);
            } elseif ($appliesTo === 'products') {
                $productBarcodes = array_filter((array) $request->input('product_barcodes', []), fn($v) => !empty($v));
                $promotion->products()->sync($productBarcodes);
                // Clear categories if scope changed to products
                $promotion->categories()->sync([]);
            } elseif ($appliesTo === 'all') {
                // Clear both when scope is "all"
                $promotion->categories()->sync([]);
                $promotion->products()->sync([]);
            }

            // Reapply or remove promotion from products
            if ($promotion->is_currently_active) {
                // Re-evaluate products currently carrying this promotion first:
                // if the scope narrowed (e.g. "all" -> specific products), the
                // ones that left the scope must lose their sale_price.
                $this->promotionService->removePromotionFromProducts($promotion);
                $this->promotionService->applyPromotionToProducts($promotion);
            } elseif ($wasActive && !$promotion->is_currently_active) {
                $this->promotionService->removePromotionFromProducts($promotion);
            }

            DB::commit();

            $this->flushPromotionCaches($promotion->id);

            return response()->json([
                'success' => true,
                'message' => 'Promotion updated successfully',
                'data' => $promotion->load(['categories', 'products']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update promotion',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete promotion
     */
    public function destroy($id)
    {
        try {
            $promotion = Promotion::findOrFail($id);

            DB::beginTransaction();

            // Remove promotion from products
            $this->promotionService->removePromotionFromProducts($promotion);

            // Delete images
            if ($promotion->image_url) {
                $this->cloudinaryService->deleteImage($promotion->image_url);
            }
            if ($promotion->banner_image_url) {
                $this->cloudinaryService->deleteImage($promotion->banner_image_url);
            }

            $promotionId = $promotion->id;
            $promotion->delete();

            DB::commit();

            $this->flushPromotionCaches($promotionId);

            return response()->json([
                'success' => true,
                'message' => 'Promotion deleted successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete promotion',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Set promotion as featured
     */
    public function setFeatured($id)
    {
        try {
            $promotion = Promotion::findOrFail($id);
            $promotion->update(['is_featured' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Promotion set as featured',
                'data' => $promotion,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to set featured promotion',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get promotion analytics
     */
    public function analytics($id)
    {
        try {
            $analytics = $this->promotionService->getPromotionAnalytics($id);

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch analytics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Manually sync promotion status (activate/deactivate based on dates)
     */
    public function syncStatus()
    {
        try {
            $result = $this->promotionService->syncPromotionStatus();

            return response()->json([
                'success' => true,
                'message' => 'Promotion status synced',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to sync status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get overall promotions summary analytics
     *
     * IMPORTANT: All "is this product on sale?" predicates MUST go through
     * Product::onSale() so the admin dashboard and the public mobile-app
     * endpoint cannot disagree about which products are discounted.
     * (Historical bug: this method queried a non-existent `on_sale` column,
     * which made the dashboard silently report zero discounts even though
     * the app was happily showing them.)
     */
    public function summaryAnalytics()
    {
        try {
            // Single source of truth: same predicate the public products endpoint uses.
            $productsOnSaleCount = \App\Models\Product::onSale()->count();

            // Sum potential customer savings across in-stock discounted units.
            // COALESCE(original_price, price) handles legacy rows where the original
            // price wasn't snapshotted before the discount was applied.
            $totalDiscountGiven = (float) \App\Models\Product::onSale()
                ->selectRaw('COALESCE(SUM((COALESCE(original_price, price) - sale_price) * stock_quantity), 0) as total')
                ->value('total');

            $data = [
                'total_promotions' => Promotion::count(),
                'active_promotions' => Promotion::where('is_active', true)
                    ->where('start_date', '<=', now())
                    ->where('end_date', '>=', now())
                    ->count(),
                'scheduled_promotions' => Promotion::where('start_date', '>', now())->count(),
                'expired_promotions' => Promotion::where('end_date', '<', now())->count(),
                'featured_promotion' => Promotion::where('is_featured', true)->first(),
                'products_on_sale' => $productsOnSaleCount,
                'total_discount_given' => round($totalDiscountGiven, 2),
                'promotions_by_type' => Promotion::select('discount_type', DB::raw('count(*) as count'))
                    ->groupBy('discount_type')
                    ->get(),
                'recent_promotions' => Promotion::orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get(['id', 'title', 'discount_type', 'discount_value', 'start_date', 'end_date', 'is_active']),
            ];

            // Drift alarm: an active promotion exists but no product looks on sale.
            // This usually means the promotion was created/edited but never applied
            // (sale_price wasn't backfilled). Surface it loudly so it's caught early.
            if ($data['active_promotions'] > 0 && $productsOnSaleCount === 0) {
                \Log::warning('promotions.summary: active promotions exist but products_on_sale=0', [
                    'active_promotions' => $data['active_promotions'],
                    'hint' => 'Run PromotionService::recalculateAllProductPrices() to backfill sale_price.',
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            \Log::error('promotions.summary failed', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch summary analytics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
