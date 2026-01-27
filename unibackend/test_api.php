<?php
// Quick API test script

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Category;

echo "========== TESTING API SCENARIOS ==========\n\n";

// Test 1: Category with subcategories but no products
echo "1. Categories WITH subcategories:\n";
$catsWithSubs = Category::whereNull('parent_id')
    ->has('subcategories')
    ->withCount(['subcategories', 'products'])
    ->take(3)
    ->get();

foreach ($catsWithSubs as $cat) {
    echo "   - {$cat->name_en} (ID: {$cat->id}, Subcategories: {$cat->subcategories_count}, Products: {$cat->products_count})\n";
}

// Test 2: Categories with products but no subcategories
echo "\n2. Categories WITH products (no subcategories):\n";
$catsWithProducts = Category::whereNull('parent_id')
    ->has('products')
    ->doesntHave('subcategories')
    ->withCount(['products'])
    ->take(3)
    ->get();

foreach ($catsWithProducts as $cat) {
    echo "   - {$cat->name_en} (ID: {$cat->id}, Products: {$cat->products_count})\n";
}

// Test 3: Subcategories with products
echo "\n3. Subcategories WITH products:\n";
$subsWithProducts = Category::whereNotNull('parent_id')
    ->has('products')
    ->with('parent')
    ->withCount('products')
    ->take(3)
    ->get();

foreach ($subsWithProducts as $cat) {
    echo "   - {$cat->name_en} (ID: {$cat->id}, Parent: {$cat->parent->name_en}, Products: {$cat->products_count})\n";
}

// Test 4: Empty categories (no products, no subcategories)
echo "\n4. EMPTY categories (no products, no subcategories):\n";
$emptyCats = Category::whereNull('parent_id')
    ->doesntHave('products')
    ->doesntHave('subcategories')
    ->take(5)
    ->get();

foreach ($emptyCats as $cat) {
    echo "   - {$cat->name_en} (ID: {$cat->id})\n";
}

echo "\n========== SUMMARY ==========\n";
echo "✓ Categories with subcategories: " . Category::whereNull('parent_id')->has('subcategories')->count() . "\n";
echo "✓ Categories with products only: " . Category::whereNull('parent_id')->has('products')->doesntHave('subcategories')->count() . "\n";
echo "✓ Subcategories with products: " . Category::whereNotNull('parent_id')->has('products')->count() . "\n";
echo "✓ Empty parent categories: " . Category::whereNull('parent_id')->doesntHave('products')->doesntHave('subcategories')->count() . "\n";
echo "✓ Empty subcategories: " . Category::whereNotNull('parent_id')->doesntHave('products')->count() . "\n";
