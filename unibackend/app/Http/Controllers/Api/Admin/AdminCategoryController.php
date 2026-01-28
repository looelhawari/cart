<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
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

        $category->delete();

        return response()->json(['message' => 'Category deleted successfully']);
    }

    public function uploadImage(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
        ]);

        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($category->image && file_exists(public_path($category->image))) {
                unlink(public_path($category->image));
            }

            $image = $request->file('image');
            $filename = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $path = 'uploads/categories';
            
            // Create directory if it doesn't exist
            if (!file_exists(public_path($path))) {
                mkdir(public_path($path), 0777, true);
            }

            $image->move(public_path($path), $filename);
            $category->image = '/' . $path . '/' . $filename;
            $category->save();
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
                'parent_id' => $category->parent_id,
                'is_active' => $category->is_active,
                'sort_order' => $category->sort_order,
                'product_count' => $category->products()->count(),
                'children' => $this->buildTree($category->children),
            ];
        });
    }
}
