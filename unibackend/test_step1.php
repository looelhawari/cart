<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "╔════════════════════════════════════════════════════════════════╗\n";
echo "║          STEP 1 - NEWEST CART WINS TEST                        ║\n";
echo "╚════════════════════════════════════════════════════════════════╝\n\n";

$cartService = app(\App\Services\CartService::class);

// Test Scenario 1: Old user cart + New guest cart → Guest should win
echo "═══════════════════════════════════════════════════════════════\n";
echo "  TEST 1: Old User Cart (10 items) + New Guest Cart (2 items)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$userId = 2;

// Check current state
$userCart = \App\Models\Cart::where('user_id', $userId)->first();
if ($userCart) {
    echo "BEFORE:\n";
    echo "  User Cart ID: {$userCart->id}\n";
    echo "  Items: {$userCart->items->count()}\n";
    echo "  Updated: {$userCart->updated_at}\n\n";
}

// Create a new guest cart (simulating fresh login)
$sessionId = 'test_session_' . time();
$guestCart = \App\Models\Cart::create(['session_id' => $sessionId]);

// Add 2 fresh items to guest cart - get any 2 products
$products = \App\Models\Product::take(2)->get();

if ($products->count() >= 2) {
    \App\Models\CartItem::create([
        'cart_id' => $guestCart->id,
        'product_id' => $products[0]->barcode,
        'quantity' => 1,
        'price' => $products[0]->price,
    ]);

    \App\Models\CartItem::create([
        'cart_id' => $guestCart->id,
        'product_id' => $products[1]->barcode,
        'quantity' => 1,
        'price' => $products[1]->price,
    ]);
} else {
    echo "❌ ERROR: Not enough products in database\n";
    exit(1);
}

echo "Created GUEST cart:\n";
echo "  Cart ID: {$guestCart->id}\n";
echo "  Session: {$sessionId}\n";
echo "  Items: {$guestCart->fresh()->items->count()}\n";
echo "  Updated: {$guestCart->updated_at}\n\n";

echo "Calling getCart() with user_id={$userId} AND session_id={$sessionId}...\n\n";

// Call getCart - should apply "Newest Cart Wins"
$resultCart = $cartService->getCart($userId, $sessionId);

echo "═══════════════════════════════════════════════════════════════\n";
echo "  RESULT\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

echo "Final Cart:\n";
echo "  Cart ID: {$resultCart->id}\n";
echo "  User ID: {$resultCart->user_id}\n";
echo "  Session ID: " . ($resultCart->session_id ?? 'null') . "\n";
echo "  Items: {$resultCart->items->count()}\n";
echo "  Updated: {$resultCart->updated_at}\n\n";

if ($resultCart->items->count() == 2 && $resultCart->user_id == $userId) {
    echo "✅ TEST 1 PASSED: Guest cart won (2 items kept, old 10 items deleted)\n\n";
} else {
    echo "❌ TEST 1 FAILED: Expected 2 items with user_id={$userId}\n";
    echo "   Got {$resultCart->items->count()} items\n\n";
}

// Verify old user cart was deleted
$oldCartCheck = \App\Models\Cart::where('user_id', $userId)->where('id', '!=', $resultCart->id)->first();
if ($oldCartCheck) {
    echo "❌ WARNING: Old user cart still exists (ID: {$oldCartCheck->id})\n\n";
} else {
    echo "✅ Verified: Old user cart was properly deleted\n\n";
}

// Show items in final cart
echo "Items in Final Cart:\n";
foreach ($resultCart->items as $item) {
    $productName = $item->product ? $item->product->name_en : "Product #{$item->product_id}";
    echo "  - {$productName} (Qty: {$item->quantity})\n";
}

echo "\n═══════════════════════════════════════════════════════════════\n\n";

// Check logs
echo "Check Laravel logs for:\n";
echo "  🏆 [STEP 1] BOTH CARTS - APPLYING NEWEST WINS STRATEGY\n";
echo "  ✅ [STEP 1] GUEST CART WINS (newer)\n\n";

echo "Expected behavior:\n";
echo "  - Old user cart (10 items from Jan 21) deleted\n";
echo "  - New guest cart (2 items from today) converted to user cart\n";
echo "  - NO MERGING - only newest cart kept\n\n";
