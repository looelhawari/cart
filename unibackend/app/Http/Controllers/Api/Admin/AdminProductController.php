<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductWatchlist;
use App\Services\EnterpriseNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Services\CloudinaryService;

class AdminProductController extends Controller
{
    protected ?EnterpriseNotificationService $notificationService;

    public function __construct()
    {
        try {
            $this->notificationService = app(EnterpriseNotificationService::class);
        } catch (\Exception $e) {
            $this->notificationService = null;
        }
    }

    public function index(Request $request)
    {
        $query = Product::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name_en', 'like', "%{$search}%")
                    ->orWhere('name_ar', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->whereHas('categories', function($q) use ($request) {
                $q->where('categories.id', $request->category_id);
            });
        }

        if ($request->filled('availability')) {
            $query->where('availability', $request->availability);
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        // Whitelist sort columns and direction to prevent SQL injection.
        // BUGFIX: the previous version called $request->get('order') a second
        // time *without* the default, so when the request omitted ?order=
        // the truthy branch returned null and Laravel's orderBy() threw
        // "Order direction must be asc or desc" → 500. Normalise once.
        $allowedSorts = ['created_at', 'updated_at', 'price', 'stock_quantity', 'name_en', 'name_ar', 'barcode', 'sales_count', 'is_active'];
        $sortBy = in_array($request->get('sort_by'), $allowedSorts, true) ? $request->get('sort_by') : 'created_at';
        $orderInput = strtolower((string) $request->get('order', 'desc'));
        $sortOrder = in_array($orderInput, ['asc', 'desc'], true) ? $orderInput : 'desc';

        $products = $query->with('categories')
            ->orderBy($sortBy, $sortOrder)
            ->paginate($request->get('per_page', 20));

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'barcode' => 'required|string|min:1|max:50|unique:products',
            'name_en' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'description_en' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'category_id' => 'required|exists:categories,id',
            'price' => 'required|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'is_in_stock' => 'nullable|boolean',
            'weight' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'is_featured' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        // Remove category_id from validated data since it's not a product column
        $categoryId = $validated['category_id'];
        unset($validated['category_id']);

        // Auto-generate slug from name_en
        $validated['slug'] = Str::slug($validated['name_en']) . '-' . $validated['barcode'];

        // Create the product
        $product = Product::create($validated);

        // Attach the category using the pivot table
        $product->categories()->attach($categoryId);

        return response()->json($product->load('categories'), 201);
    }

    public function show($barcode)
    {
        $product = Product::where('barcode', $barcode)->with('categories')->firstOrFail();
        return response()->json($product);
    }

    public function update(Request $request, $barcode)
    {
        $product = Product::where('barcode', $barcode)->firstOrFail();
        
        // Store old values for comparison
        $oldPrice = $product->price;
        $wasOutOfStock = !$product->is_in_stock || $product->stock_quantity <= 0;

        $validated = $request->validate([
            'name_en' => 'sometimes|string|max:255',
            'name_ar' => 'sometimes|string|max:255',
            'description_en' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'category_id' => 'sometimes|exists:categories,id',
            'price' => 'sometimes|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'is_in_stock' => 'nullable|boolean',
            'weight' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'is_featured' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        // Handle category update separately
        if (isset($validated['category_id'])) {
            $categoryId = $validated['category_id'];
            unset($validated['category_id']);
            // Sync categories (replaces all existing with new one)
            $product->categories()->sync([$categoryId]);
        }

        // Update slug if name_en changes
        if (isset($validated['name_en'])) {
            $validated['slug'] = Str::slug($validated['name_en']) . '-' . $product->barcode;
        }

        $product->update($validated);
        $product->refresh();

        // Check for price changes and back-in-stock notifications
        // PERFORMANCE HARDENED (audit C12 — sync HTTP fan-out):
        // The previous version looped over EVERY watcher of the product and
        // made a synchronous Expo HTTP call per watcher (each up to 30s on
        // retry). A popular product had N × 30s of network in the admin's
        // `PUT /products/{barcode}` request — single-server killer.
        //
        // Dispatch the existing ProcessProductWatchlistNotifications job
        // instead. It's a batch scanner that handles price-drop AND
        // back-in-stock notifications, runs on the queue worker, and the
        // admin's request returns immediately. The job already has 500-row
        // limits + idempotency flags on the watchlist rows.
        $priceDropped = isset($validated['price']) && $validated['price'] < $oldPrice;
        $isNowInStock = $product->is_in_stock && $product->stock_quantity > 0;
        $backInStock = $wasOutOfStock && $isNowInStock;

        if ($priceDropped || $backInStock) {
            try {
                \App\Jobs\ProcessProductWatchlistNotifications::dispatch()->afterCommit();
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Failed to dispatch watchlist notifications', [
                    'product' => $product->barcode,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        return response()->json($product->load('categories'));
    }

    public function destroy($barcode)
    {
        $product = Product::where('barcode', $barcode)->firstOrFail();

        if ($product->image) {
            $cloudinary = new CloudinaryService();
            $publicId = $cloudinary->getPublicIdFromUrl($product->image);
            if ($publicId) {
                $cloudinary->deleteImage($publicId);
            }
        }

        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }

    public function uploadImage(Request $request, $barcode)
    {
        $product = Product::where('barcode', $barcode)->firstOrFail();

        // SECURITY HARDENED (audit C7 — SVG stored XSS):
        // SVG can carry <script>/<foreignObject>/<onload> payloads. Cloudinary
        // serves uploads with their original Content-Type, so an attacker-
        // crafted SVG executes inline in any admin dashboard / WebView that
        // renders it. Removed `svg` from the mime allowlist and added
        // `mimetypes:` to validate the *actual* file MIME, not just the
        // user-supplied extension.
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|mimetypes:image/jpeg,image/png,image/webp|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $cloudinary = new CloudinaryService();

            // Delete old image if exists
            if ($product->image) {
                $oldPublicId = $cloudinary->getPublicIdFromUrl($product->image);
                if ($oldPublicId) {
                    $cloudinary->deleteImage($oldPublicId);
                }
            }

            // Upload to Cloudinary
            $result = $cloudinary->uploadImage(
                $request->file('image'),
                'products',
                ['public_id' => 'product_' . $product->barcode . '_' . time()]
            );

            if ($result['success']) {
                $product->image = $result['url'];
                $product->save();
            } else {
                return response()->json([
                    'message' => 'Failed to upload image',
                    'error' => $result['error'] ?? 'Unknown error'
                ], 500);
            }
        }

        return response()->json($product->load('categories'));
    }

    /**
     * Toggle product stock status
     */
    public function toggleStock(Request $request, $barcode)
    {
        $product = Product::where('barcode', $barcode)->firstOrFail();
        
        $request->validate([
            'is_in_stock' => 'required|boolean',
        ]);

        $product->update([
            'is_in_stock' => $request->is_in_stock,
        ]);

        return response()->json([
            'success' => true,
            'message' => $request->is_in_stock ? 'Product marked as in stock' : 'Product marked as out of stock',
            'data' => $product->load('categories'),
        ]);
    }

    /**
     * Bulk update stock status for multiple products
     */
    public function bulkToggleStock(Request $request)
    {
        $request->validate([
            'products' => 'required|array|min:1',
            'products.*.barcode' => 'required|exists:products,barcode',
            'products.*.is_in_stock' => 'required|boolean',
        ]);

        $updated = [];
        foreach ($request->products as $item) {
            Product::where('barcode', $item['barcode'])->update([
                'is_in_stock' => $item['is_in_stock'],
            ]);
            $updated[] = $item['barcode'];
        }

        return response()->json([
            'success' => true,
            'message' => count($updated) . ' products updated successfully',
            'data' => ['updated_barcodes' => $updated],
        ]);
    }

    /**
     * Get products with low stock or out of stock
     */
    public function stockAlerts(Request $request)
    {
        $threshold = $request->get('threshold', 10);

        $outOfStock = Product::where('is_in_stock', false)
            ->orWhere('stock_quantity', 0)
            ->count();

        $lowStock = Product::where('stock_quantity', '>', 0)
            ->where('stock_quantity', '<=', $threshold)
            ->where('is_in_stock', true)
            ->count();

        $products = Product::where(function ($query) use ($threshold) {
            $query->where('is_in_stock', false)
                ->orWhere('stock_quantity', 0)
                ->orWhere(function ($q) use ($threshold) {
                    $q->where('stock_quantity', '<=', $threshold)
                        ->where('stock_quantity', '>', 0);
                });
        })
            ->with('categories')
            ->orderBy('stock_quantity', 'asc')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'out_of_stock_count' => $outOfStock,
                'low_stock_count' => $lowStock,
                'threshold' => $threshold,
                'products' => $products,
            ],
        ]);
    }
}
