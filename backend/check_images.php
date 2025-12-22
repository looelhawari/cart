<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Category;
use App\Models\Product;

echo "Checking for malformed image URLs...\n\n";

// Check categories
$badCategories = Category::whereNotNull('image')
    ->where(function($q) {
        $q->where('image', 'like', '%ttps:%')
          ->orWhere('image', 'like', '%ttp:%');
    })
    ->get();

echo "Categories with malformed URLs: " . $badCategories->count() . "\n";
foreach ($badCategories as $cat) {
    echo "  ID: {$cat->id} | {$cat->name_en} | {$cat->image}\n";
}

// Check products
$badProducts = Product::whereNotNull('image')
    ->where(function($q) {
        $q->where('image', 'like', '%ttps:%')
          ->orWhere('image', 'like', '%ttp:%');
    })
    ->get();

echo "\nProducts with malformed URLs: " . $badProducts->count() . "\n";
foreach ($badProducts as $prod) {
    echo "  Barcode: {$prod->barcode} | {$prod->name_en} | {$prod->image}\n";
}

// Show some correct examples
echo "\n\nSample correct URLs:\n";
$goodCategories = Category::whereNotNull('image')
    ->where('image', 'like', 'https://%')
    ->limit(3)
    ->get();
foreach ($goodCategories as $cat) {
    echo "  ✅ {$cat->name_en}: {$cat->image}\n";
}
