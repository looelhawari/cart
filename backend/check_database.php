<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Checking Database Tables ===\n\n";

// Check products
$productCount = DB::table('products')->count();
echo "Products in table: $productCount\n";

// Check categories  
$categoryCount = DB::table('categories')->count();
echo "Categories in table: $categoryCount\n";

// Check product_categories pivot
$pivotCount = DB::table('product_categories')->count();
echo "Product-Category links: $pivotCount\n\n";

if ($pivotCount > 0) {
    echo "=== Sample Product-Category Links ===\n";
    $links = DB::table('product_categories')->limit(10)->get();
    foreach ($links as $link) {
        echo "Product: {$link->product_id} -> Category: {$link->category_id}\n";
    }
} else {
    echo "⚠️  NO PRODUCTS ARE LINKED TO CATEGORIES!\n\n";
}

// Check sample products
echo "\n=== Sample Products ===\n";
$products = DB::table('products')->limit(5)->get(['barcode', 'name_en', 'price', 'stock_quantity']);
foreach ($products as $product) {
    echo "Barcode: {$product->barcode} - {$product->name_en} - \${$product->price} (Stock: {$product->stock_quantity})\n";
}

// Check sample categories
echo "\n=== Sample Categories ===\n";
$categories = DB::table('categories')->limit(10)->get(['id', 'name_en', 'name_ar', 'parent_id']);
foreach ($categories as $cat) {
    $parent = $cat->parent_id ? " (Parent: {$cat->parent_id})" : " (Root)";
    echo "ID: {$cat->id} - EN: {$cat->name_en} - AR: {$cat->name_ar}{$parent}\n";
}
