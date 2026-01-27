<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Category;

// Test a category with subcategories
$categoryId = 4; // Breakfast Cereals
echo "Testing Category ID: $categoryId\n\n";

$category = Category::with('subcategories')->find($categoryId);

if ($category) {
    echo "Category: {$category->name_en}\n";
    echo "Has subcategories: " . ($category->subcategories->count() > 0 ? "YES" : "NO") . "\n";
    echo "Subcategory count: {$category->subcategories->count()}\n\n";

    if ($category->subcategories->count() > 0) {
        echo "Subcategories:\n";
        foreach ($category->subcategories as $sub) {
            echo "  - ID: {$sub->id}, Name: {$sub->name_en}\n";
        }
    }

    echo "\n\nAPI Response Simulation:\n";
    echo json_encode([
        'success' => true,
        'data' => [
            'category' => $category->toArray(),
            'products' => [],
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} else {
    echo "Category not found\n";
}
