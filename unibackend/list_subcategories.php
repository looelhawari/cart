<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Category;

// Get all subcategories grouped by parent
$subcategories = Category::whereNotNull('parent_id')
    ->with('parent')
    ->orderBy('parent_id')
    ->orderBy('id')
    ->get();

$grouped = $subcategories->groupBy('parent_id');

foreach ($grouped as $parentId => $subs) {
    $parent = $subs->first()->parent;
    echo "-- Parent: {$parent->name_en} (ID: {$parentId})\n";
    foreach ($subs as $sub) {
        echo "-- Subcategory: {$sub->name_en} (ID: {$sub->id})\n";
    }
    echo "\n";
}
