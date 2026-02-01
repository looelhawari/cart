<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Services\CloudinaryService;

class AdminProductController extends Controller
{
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

        $products = $query->with('categories')
            ->orderBy($request->get('sort_by', 'created_at'), $request->get('order', 'desc'))
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

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
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
}
