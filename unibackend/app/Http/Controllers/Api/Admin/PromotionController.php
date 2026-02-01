<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use App\Services\PromotionService;
use App\Services\CloudinaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class PromotionController extends Controller
{
    protected PromotionService $promotionService;
    protected CloudinaryService $cloudinaryService;

    public function __construct(PromotionService $promotionService, CloudinaryService $cloudinaryService)
    {
        $this->promotionService = $promotionService;
        $this->cloudinaryService = $cloudinaryService;
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
            if ($request->has('category_ids') && $request->input('applies_to') === 'category') {
                $promotion->categories()->attach($request->input('category_ids'));
            }

            // Attach products
            if ($request->has('product_barcodes') && $request->input('applies_to') === 'products') {
                $promotion->products()->attach($request->input('product_barcodes'));
            }

            // Apply promotion to products if active
            if ($promotion->is_currently_active) {
                $this->promotionService->applyPromotionToProducts($promotion);
            }

            DB::commit();

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
            $promotion->update($request->except(['category_ids', 'product_barcodes', 'image', 'banner_image']));

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

            // Update categories
            if ($request->has('category_ids')) {
                $promotion->categories()->sync($request->input('category_ids', []));
            }

            // Update products
            if ($request->has('product_barcodes')) {
                $promotion->products()->sync($request->input('product_barcodes', []));
            }

            // Reapply or remove promotion from products
            if ($promotion->is_currently_active) {
                $this->promotionService->applyPromotionToProducts($promotion);
            } elseif ($wasActive && !$promotion->is_currently_active) {
                $this->promotionService->removePromotionFromProducts($promotion);
            }

            DB::commit();

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

            $promotion->delete();

            DB::commit();

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
     */
    public function summaryAnalytics()
    {
        try {
            $data = [
                'total_promotions' => Promotion::count(),
                'active_promotions' => Promotion::where('is_active', true)
                    ->where('start_date', '<=', now())
                    ->where('end_date', '>=', now())
                    ->count(),
                'scheduled_promotions' => Promotion::where('start_date', '>', now())->count(),
                'expired_promotions' => Promotion::where('end_date', '<', now())->count(),
                'featured_promotion' => Promotion::where('is_featured', true)->first(),
                'products_on_sale' => DB::table('products')->where('on_sale', true)->count(),
                'total_discount_given' => DB::table('products')
                    ->where('on_sale', true)
                    ->selectRaw('SUM((original_price - sale_price) * stock_quantity) as total')
                    ->value('total') ?? 0,
                'promotions_by_type' => Promotion::select('discount_type', DB::raw('count(*) as count'))
                    ->groupBy('discount_type')
                    ->get(),
                'recent_promotions' => Promotion::orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get(['id', 'title', 'discount_type', 'discount_value', 'start_date', 'end_date', 'is_active']),
            ];

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch summary analytics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
