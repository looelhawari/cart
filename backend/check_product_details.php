<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Products in Database ===\n\n";

$products = App\Models\Product::with('category')->limit(20)->get();

foreach($products as $product) {
    $categoryName = $product->category ? $product->category->name : 'No Category';
    $categoryId = $product->category_id ?? 'NULL';
    echo "ID: {$product->id}\n";
    echo "Name: {$product->name}\n";
    echo "Category ID: {$categoryId}\n";
    echo "Category: {$categoryName}\n";
    echo "Price: {$product->price}\n";
    echo "Stock: {$product->stock}\n";
    echo "---\n";
}
