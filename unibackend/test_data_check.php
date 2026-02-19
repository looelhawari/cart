<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Product;
use App\Models\Category;
use App\Models\Order;
use App\Models\Address;
use App\Models\DeliveryZone;

echo "=== DATABASE COUNTS ===\n";
echo "Users: " . User::count() . "\n";
echo "Customers: " . User::where('role', 'customer')->count() . "\n";
echo "Products: " . Product::count() . "\n";
echo "Active Products: " . Product::where('is_active', true)->count() . "\n";
echo "Categories: " . Category::count() . "\n";
echo "Orders: " . Order::count() . "\n";
echo "Addresses: " . Address::count() . "\n";
echo "DeliveryZones: " . DeliveryZone::count() . "\n";

echo "\n=== SAMPLE PRODUCTS (active, barcode + name) ===\n";
$products = Product::where('is_active', true)->take(10)->get(['barcode', 'name_en', 'price', 'stock_quantity']);
foreach ($products as $p) {
    echo "  barcode={$p->barcode} name={$p->name_en} price={$p->price} stock={$p->stock_quantity}\n";
}

echo "\n=== SAMPLE CUSTOMERS ===\n";
$users = User::where('role', 'customer')->where('is_verified', true)->take(3)->get(['id', 'email', 'first_name']);
foreach ($users as $u) {
    echo "  id={$u->id} email={$u->email} name={$u->first_name}\n";
}

echo "\n=== DELIVERY ZONES ===\n";
$zones = DeliveryZone::where('is_active', true)->take(5)->get(['id', 'name', 'delivery_fee', 'minimum_order']);
foreach ($zones as $z) {
    echo "  id={$z->id} name={$z->name} fee={$z->delivery_fee} min_order={$z->minimum_order}\n";
}

echo "\n=== ADDRESSES (first 3) ===\n";
$addrs = Address::take(3)->get(['id', 'user_id', 'label', 'city', 'street']);
foreach ($addrs as $a) {
    echo "  id={$a->id} user_id={$a->user_id} label={$a->label} city={$a->city}\n";
}
