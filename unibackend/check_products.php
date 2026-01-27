<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Database Status ===\n\n";

$totalCategories = App\Models\Category::count();
$totalProducts = App\Models\Product::count();

echo "Total Categories: $totalCategories\n";
echo "Total Products: $totalProducts\n\n";

echo "=== Categories with Products ===\n\n";

$categoriesWithProducts = App\Models\Category::withCount('products')
    ->having('products_count', '>', 0)
    ->orderBy('products_count', 'desc')
    ->get();

foreach($categoriesWithProducts as $category) {
    echo "{$category->id} - {$category->name}: {$category->products_count} products\n";
}

echo "\n=== Empty Categories (first 20) ===\n\n";

$emptyCategories = App\Models\Category::withCount('products')
    ->having('products_count', '=', 0)
    ->limit(20)
    ->get();

foreach($emptyCategories as $category) {
    echo "{$category->id} - {$category->name}\n";
}

$emptyCount = App\Models\Category::withCount('products')->having('products_count', '=', 0)->count();
echo "\nTotal empty categories: $emptyCount\n";
