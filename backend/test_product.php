<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    $product = \App\Models\Product::with('categories')->first();

    if ($product) {
        echo "Product Barcode: " . $product->barcode . "\n";
        echo "Product Name: " . $product->name_en . "\n";
        echo "Categories Count: " . $product->categories->count() . "\n";
        if ($product->categories->count() > 0) {
            echo "First Category: " . $product->categories->first()->name_en . "\n";
        }
        echo "SUCCESS: Product with categories loaded\n";
    } else {
        echo "No products found\n";
    }
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}
