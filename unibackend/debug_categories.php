<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Category;

// Test the API endpoint response
$categories = Category::with('subcategories')
    ->whereNull('parent_id')
    ->withCount('products')
    ->orderBy('sort_order')
    ->orderBy('name_en')
    ->limit(10)
    ->get();

echo "Total root categories in DB: " . Category::whereNull('parent_id')->count() . "\n\n";

echo "First 10 root categories:\n";
foreach ($categories as $cat) {
    echo sprintf(
        "ID: %d | Name: %s | parent_id: %s | sort_order: %d | is_active: %d | products: %d\n",
        $cat->id,
        $cat->name_en,
        $cat->parent_id ?? 'NULL',
        $cat->sort_order,
        $cat->is_active,
        $cat->products_count
    );
}

echo "\n\nAPI Response Structure:\n";
$response = [
    'success' => true,
    'data' => ['categories' => $categories->toArray()],
];

echo "Number of categories in response: " . count($response['data']['categories']) . "\n";
echo "\nFirst category structure:\n";
if (count($response['data']['categories']) > 0) {
    print_r($response['data']['categories'][0]);
}
