<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Assigning Products to Categories ===\n\n";

// Product to category mapping based on product names
$productCategoryMap = [
    '1234567890123' => 'Bakery',           // Brown Toast Bread
    '1234567890124' => 'Croissants',       // Chocolate Croissant
    '1234567890125' => 'Cheese',           // Roumy Cheese
    '1234567890126' => 'Milk',             // Milk
    '1234567890127' => 'Eggs',             // Eggs
];

// Get all products
$products = DB::table('products')->get(['barcode', 'name_en']);

echo "Found {$products->count()} products\n\n";

$assigned = 0;

foreach ($products as $product) {
    $categoryId = null;
    $categoryName = '';
    
    // Try to match product name to category
    $name = strtolower($product->name_en);
    
    if (str_contains($name, 'bread') || str_contains($name, 'toast')) {
        $category = DB::table('categories')->where('name_en', 'LIKE', '%Bread%')->orWhere('name_en', 'LIKE', '%Bakery%')->first();
        $categoryId = $category?->id;
        $categoryName = $category?->name_en;
    } elseif (str_contains($name, 'croissant') || str_contains($name, 'donut') || str_contains($name, 'pastry')) {
        $category = DB::table('categories')->where('name_en', 'LIKE', '%Croissant%')->orWhere('name_en', 'LIKE', '%Pastries%')->first();
        $categoryId = $category?->id;
        $categoryName = $category?->name_en;
    } elseif (str_contains($name, 'cheese')) {
        $category = DB::table('categories')->where('name_en', 'LIKE', '%Cheese%')->orWhere('name_en', 'LIKE', '%Dairy%')->first();
        $categoryId = $category?->id;
        $categoryName = $category?->name_en;
    } elseif (str_contains($name, 'milk')) {
        $category = DB::table('categories')->where('name_en', 'LIKE', '%Milk%')->orWhere('name_en', 'LIKE', '%Dairy%')->first();
        $categoryId = $category?->id;
        $categoryName = $category?->name_en;
    } elseif (str_contains($name, 'egg')) {
        $category = DB::table('categories')->where('name_en', 'LIKE', '%Egg%')->orWhere('name_en', 'LIKE', '%Dairy%')->first();
        $categoryId = $category?->id;
        $categoryName = $category?->name_en;
    } elseif (str_contains($name, 'juice') || str_contains($name, 'beverage')) {
        $category = DB::table('categories')->where('name_en', 'LIKE', '%Juice%')->orWhere('name_en', 'LIKE', '%Beverage%')->first();
        $categoryId = $category?->id;
        $categoryName = $category?->name_en;
    } elseif (str_contains($name, 'snack') || str_contains($name, 'chip')) {
        $category = DB::table('categories')->where('name_en', 'LIKE', '%Snack%')->orWhere('name_en', 'LIKE', '%Chip%')->first();
        $categoryId = $category?->id;
        $categoryName = $category?->name_en;
    }
    
    // If no category found, assign to first available category
    if (!$categoryId) {
        $category = DB::table('categories')->where('id', '>=', 2)->first();
        $categoryId = $category?->id ?? 2;
        $categoryName = $category?->name_en ?? 'Default';
    }
    
    if ($categoryId) {
        // Check if link already exists
        $exists = DB::table('product_categories')
            ->where('product_id', $product->barcode)
            ->where('category_id', $categoryId)
            ->exists();
        
        if (!$exists) {
            DB::table('product_categories')->insert([
                'product_id' => $product->barcode,
                'category_id' => $categoryId,
            ]);
            
            echo "✓ Assigned: {$product->name_en} → {$categoryName} (ID: {$categoryId})\n";
            $assigned++;
        }
    }
}

echo "\n=== Summary ===\n";
echo "Total products assigned: $assigned\n";
echo "Total links in pivot table: " . DB::table('product_categories')->count() . "\n";
