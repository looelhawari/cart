<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Category;
use App\Models\Product;

echo "========== DATABASE STATUS ==========\n\n";

echo "Total Categories: " . Category::count() . "\n";
echo "Parent Categories: " . Category::whereNull('parent_id')->count() . "\n";
echo "Subcategories: " . Category::whereNotNull('parent_id')->count() . "\n";
echo "Total Products: " . Product::count() . "\n\n";

echo "========== SAMPLE PARENT CATEGORIES ==========\n\n";
$parents = Category::whereNull('parent_id')
    ->withCount(['products', 'subcategories'])
    ->take(10)
    ->get();

foreach ($parents as $cat) {
    echo sprintf(
        "%d. %s (Products: %d, Subcategories: %d)\n",
        $cat->id,
        $cat->name_en,
        $cat->products_count,
        $cat->subcategories_count
    );
}

echo "\n========== SAMPLE SUBCATEGORIES ==========\n\n";
$subcats = Category::whereNotNull('parent_id')
    ->with('parent')
    ->withCount('products')
    ->take(10)
    ->get();

foreach ($subcats as $cat) {
    echo sprintf(
        "%d. %s (Parent: %s, Products: %d)\n",
        $cat->id,
        $cat->name_en,
        $cat->parent->name_en ?? 'N/A',
        $cat->products_count
    );
}

echo "\n========== SAMPLE PRODUCTS ==========\n\n";
$products = Product::with('categories')->take(10)->get();

foreach ($products as $product) {
    $catNames = $product->categories->pluck('name_en')->join(', ');
    echo sprintf(
        "%d. %s (Price: %.2f SAR, Categories: %s)\n",
        $product->barcode,
        $product->name_en,
        $product->price,
        $catNames ?: 'None'
    );
}
