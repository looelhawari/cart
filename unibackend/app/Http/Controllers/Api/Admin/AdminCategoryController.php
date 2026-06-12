<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\CloudinaryService;
use Illuminate\Http\Request;

class AdminCategoryController extends Controller
{
    public function index()
    {
        $categories = Category::with('parent', 'children')
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->get();

        return response()->json($this->buildTree($categories));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name_en' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:categories,slug',
            'description_en' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'icon' => 'nullable|string|max:255',
            'image' => 'nullable|string|max:255',
            'parent_id' => 'nullable|exists:categories,id',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $category = Category::create($validated);

        \App\Http\Controllers\Api\CategoryController::clearCache($category->id);

        return response()->json($category->load('parent'), 201);
    }

    public function show($id)
    {
        $category = Category::with(['parent', 'children', 'products'])->findOrFail($id);
        return response()->json($category);
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate([
            'name_en' => 'sometimes|string|max:255',
            'name_ar' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:categories,slug,' . $id,
            'description_en' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'icon' => 'nullable|string|max:255',
            'image' => 'nullable|string|max:255',
            'parent_id' => 'nullable|exists:categories,id',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $category->update($validated);

        \App\Http\Controllers\Api\CategoryController::clearCache($category->id);

        return response()->json($category->load('parent'));
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);

        // Check if category has products
        if ($category->products()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete category with products'
            ], 422);
        }

        // Check if category has children
        if ($category->children()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete category with subcategories'
            ], 422);
        }

        $categoryId = $category->id;
        $category->delete();

        \App\Http\Controllers\Api\CategoryController::clearCache($categoryId);

        return response()->json(['message' => 'Category deleted successfully']);
    }

    public function uploadImage(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        // SECURITY HARDENED (audit C7 — SVG stored XSS): same fix as
        // AdminProductController::uploadImage. SVG with <script>/<onload>
        // would execute when rendered inline.
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|mimetypes:image/jpeg,image/png,image/webp|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $cloudinary = new CloudinaryService();

            // Delete old image if exists
            if ($category->image) {
                $oldPublicId = $cloudinary->getPublicIdFromUrl($category->image);
                if ($oldPublicId) {
                    $cloudinary->deleteImage($oldPublicId);
                }
            }

            // Upload to Cloudinary
            $result = $cloudinary->uploadImage(
                $request->file('image'),
                'categories',
                ['public_id' => 'category_' . $category->id . '_' . time()]
            );

            if ($result['success']) {
                $category->image = $result['url'];
                $category->save();
            } else {
                return response()->json([
                    'message' => 'Failed to upload image',
                    'error' => $result['error'] ?? 'Unknown error'
                ], 500);
            }
        }

        return response()->json($category->load('parent'));
    }

    private function buildTree($categories)
    {
        return $categories->map(function ($category) {
            return [
                'id' => $category->id,
                'name_en' => $category->name_en,
                'name_ar' => $category->name_ar,
                'slug' => $category->slug,
                'description_en' => $category->description_en,
                'description_ar' => $category->description_ar,
                'parent_id' => $category->parent_id,
                'image' => $category->image,
                'icon' => $category->icon,
                'is_active' => $category->is_active,
                'sort_order' => $category->sort_order,
                'product_count' => $category->products()->count(),
                'created_at' => $category->created_at,
                'updated_at' => $category->updated_at,
                'children' => $this->buildTree($category->children),
            ];
        });
    }
}
