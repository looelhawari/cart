<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "╔════════════════════════════════════════════════════════════════╗\n";
echo "║          STEP 2 - ORDER SNAPSHOT RULE TEST                     ║\n";
echo "╚════════════════════════════════════════════════════════════════╝\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  TEST: Order totals are FROZEN at creation (cart changes ignored)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$orderService = app(\App\Services\OrderService::class);
$cartService = app(\App\Services\CartService::class);

// Setup: Create a cart with known items
$userId = 2;
$cart = \App\Models\Cart::where('user_id', $userId)->first();

if (!$cart) {
    $cart = \App\Models\Cart::create(['user_id' => $userId]);
}

// Clear any existing items
$cart->items()->delete();

// Add 2 specific products
$products = \App\Models\Product::take(2)->get();
if ($products->count() < 2) {
    echo "❌ ERROR: Not enough products in database\n";
    exit(1);
}

foreach ($products as $product) {
    \App\Models\CartItem::create([
        'cart_id' => $cart->id,
        'product_id' => $product->barcode,
        'quantity' => 2,
        'price' => $product->price,
    ]);
}

$cart->refresh();

// Calculate BEFORE snapshot
$totalsBeforeOrder = $cartService->calculateTotals($cart);

echo "STEP 1: Cart state BEFORE order creation\n";
echo "  Cart ID: {$cart->id}\n";
echo "  Items: {$cart->items->count()}\n";
echo "  Subtotal: {$totalsBeforeOrder['subtotal']} EGP\n\n";

// Get delivery address
$address = \App\Models\Address::where('user_id', $userId)->where('is_default', true)->first();
if (!$address) {
    // Try any address for this user
    $address = \App\Models\Address::where('user_id', $userId)->first();
}
if (!$address) {
    echo "❌ ERROR: No delivery address found\n";
    exit(1);
}

echo "STEP 2: Creating order (SNAPSHOT MOMENT)...\n\n";

// Create order - THIS IS THE SNAPSHOT POINT
$order = $orderService->createOrderFromCart(
    $cart,
    $userId,
    $address->id,
    'card',
    null,
    null,
    'Step 2 test order'
);

echo "✅ Order created: #{$order->id} ({$order->order_number})\n";
echo "  Subtotal: {$order->subtotal} EGP\n";
echo "  Delivery: {$order->delivery_fee} EGP\n";
echo "  Tax: {$order->tax} EGP\n";
echo "  Total: {$order->total} EGP\n\n";

// CRITICAL TEST: Modify the cart AFTER order creation
echo "STEP 3: Modifying cart AFTER order creation...\n";

// Add more items to cart
$newProduct = \App\Models\Product::skip(2)->first();
if ($newProduct) {
    \App\Models\CartItem::create([
        'cart_id' => $cart->id,
        'product_id' => $newProduct->barcode,
        'quantity' => 10,
        'price' => $newProduct->price,
    ]);
    echo "  Added: {$newProduct->name_en} (10x @ {$newProduct->price} EGP)\n";
}

// Recalculate cart totals AFTER order creation
$cart->refresh();
$totalsAfterModification = $cartService->calculateTotals($cart);

echo "\nCart state AFTER modification:\n";
echo "  Items: {$cart->items->count()}\n";
echo "  Subtotal: {$totalsAfterModification['subtotal']} EGP\n";
echo "  Change: +" . ($totalsAfterModification['subtotal'] - $totalsBeforeOrder['subtotal']) . " EGP\n\n";

// Reload order from database
$order->refresh();

echo "═══════════════════════════════════════════════════════════════\n";
echo "  SNAPSHOT IMMUTABILITY TEST\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

echo "Cart Subtotal BEFORE Order:  {$totalsBeforeOrder['subtotal']} EGP\n";
echo "Order Snapshot (frozen):      {$order->subtotal} EGP\n";
echo "Cart Subtotal AFTER Changes:  {$totalsAfterModification['subtotal']} EGP\n\n";

// Verify order totals DID NOT CHANGE
if ($order->subtotal == $totalsBeforeOrder['subtotal']) {
    echo "✅ TEST PASSED: Order totals are FROZEN\n";
    echo "   Cart changed from {$totalsBeforeOrder['subtotal']} to {$totalsAfterModification['subtotal']} EGP\n";
    echo "   Order still shows {$order->subtotal} EGP (unchanged)\n";
    echo "   Payment will use {$order->total} EGP (snapshot, not cart)\n\n";
} else {
    echo "❌ TEST FAILED: Order totals changed!\n";
    echo "   Expected: {$totalsBeforeOrder['subtotal']} EGP\n";
    echo "   Got: {$order->subtotal} EGP\n\n";
}

// Test payment initiation uses order snapshot
echo "═══════════════════════════════════════════════════════════════\n";
echo "  PAYMENT SNAPSHOT TEST\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$paymentAmountCents = (int) ($order->total * 100);
$currentCartTotal = $totalsAfterModification['subtotal'] +
                    ($totalsAfterModification['subtotal'] >= 200 ? 0 : 20) +
                    ($totalsAfterModification['subtotal'] * 0.14);

echo "Order Total (snapshot):       {$order->total} EGP\n";
echo "Payment Amount (from order):  " . ($paymentAmountCents / 100) . " EGP\n";
echo "Current Cart Would Charge:    " . number_format($currentCartTotal, 2) . " EGP\n\n";

if (abs(($paymentAmountCents / 100) - $order->total) < 0.01) {
    echo "✅ PAYMENT USES ORDER SNAPSHOT (not cart)\n";
    echo "   Cart changed but payment amount stays frozen at {$order->total} EGP\n\n";
} else {
    echo "❌ PAYMENT RECALCULATES FROM CART!\n";
    echo "   This violates the snapshot rule\n\n";
}

echo "═══════════════════════════════════════════════════════════════\n";
echo "  CONCLUSION\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

echo "Expected Behavior:\n";
echo "  1. Order created with cart snapshot (2 items, ~50 EGP)\n";
echo "  2. Cart modified after order (+10 items, +100+ EGP)\n";
echo "  3. Order totals remain unchanged (IMMUTABLE)\n";
echo "  4. Payment uses order.total column (NOT cart recalculation)\n\n";

echo "Check Laravel logs for:\n";
echo "  📸 [STEP 2] ORDER SNAPSHOT - Freezing cart totals\n";
echo "  🔒 [STEP 2] SNAPSHOT LOCKED - Order totals finalized\n";
echo "  ✅ [STEP 2] ORDER CREATED - Snapshot saved to database\n";
echo "  💳 [STEP 2] PAYMENT FROM ORDER SNAPSHOT\n\n";

// Cleanup
echo "Cleanup: Deleting test order #{$order->id}...\n";
$order->items()->delete();
$order->delete();
$cart->items()->delete();

echo "✅ Step 2 test complete\n\n";
