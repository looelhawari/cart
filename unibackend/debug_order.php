<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "╔════════════════════════════════════════════════════════════════╗\n";
echo "║          STEP 0 - BASELINE EVIDENCE COLLECTION                 ║\n";
echo "╚════════════════════════════════════════════════════════════════╝\n\n";

// Find latest order
$latestOrder = \App\Models\Order::latest()->first();

if (!$latestOrder) {
    echo "❌ No orders found in database\n";
    exit(1);
}

$userId = $latestOrder->user_id;

echo "👤 USER ID: {$userId}\n";
echo "📅 Latest Order: #{$latestOrder->id} ({$latestOrder->order_number})\n";
echo "⏰ Created: {$latestOrder->created_at}\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  DATABASE STATE (WHAT BACKEND SEES)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// Check all carts for this user
echo "📦 CARTS FOR USER {$userId}:\n\n";

$userCart = \App\Models\Cart::where('user_id', $userId)->first();
$guestCarts = \App\Models\Cart::whereNotNull('session_id')->get();

if ($userCart) {
    echo "  ✓ USER CART (ID: {$userCart->id})\n";
    echo "    Items: {$userCart->items->count()}\n";
    echo "    Updated: {$userCart->updated_at}\n";
    echo "    Session: " . ($userCart->session_id ?? 'null') . "\n\n";

    if ($userCart->items->count() > 0) {
        echo "    ITEMS:\n";
        $subtotal = 0;
        foreach ($userCart->items as $item) {
            $itemSubtotal = $item->price * $item->quantity;
            $subtotal += $itemSubtotal;
            $productName = $item->product ? $item->product->name_en : "Product ID: {$item->product_id}";
            echo "      - {$productName}\n";
            echo "        Qty: {$item->quantity} × {$item->price} EGP = {$itemSubtotal} EGP\n";
        }
        echo "    USER CART SUBTOTAL: {$subtotal} EGP\n\n";
    }
}

if ($guestCarts->count() > 0) {
    foreach ($guestCarts as $guestCart) {
        echo "  ✓ GUEST CART (ID: {$guestCart->id})\n";
        echo "    Session: {$guestCart->session_id}\n";
        echo "    Items: {$guestCart->items->count()}\n";
        echo "    Updated: {$guestCart->updated_at}\n\n";

        if ($guestCart->items->count() > 0) {
            echo "    ITEMS:\n";
            $subtotal = 0;
            foreach ($guestCart->items as $item) {
                $itemSubtotal = $item->price * $item->quantity;
                $subtotal += $itemSubtotal;
                $productName = $item->product ? $item->product->name_en : "Product ID: {$item->product_id}";
                echo "      - {$productName}\n";
                echo "        Qty: {$item->quantity} × {$item->price} EGP = {$itemSubtotal} EGP\n";
            }
            echo "    GUEST CART SUBTOTAL: {$subtotal} EGP\n\n";
        }
    }
}

echo "═══════════════════════════════════════════════════════════════\n";
echo "  ORDER #{$latestOrder->id} DETAILS\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

echo "  Order Number: {$latestOrder->order_number}\n";
echo "  Status: {$latestOrder->status}\n";
echo "  Payment Status: {$latestOrder->payment_status}\n";
echo "  Payment Method: {$latestOrder->payment_method}\n\n";

echo "  PRICING:\n";
echo "  ├─ Subtotal:     " . str_pad($latestOrder->subtotal . ' EGP', 15, ' ', STR_PAD_LEFT) . "\n";
echo "  ├─ Delivery Fee: " . str_pad($latestOrder->delivery_fee . ' EGP', 15, ' ', STR_PAD_LEFT) . "\n";
echo "  ├─ Tax:          " . str_pad($latestOrder->tax . ' EGP', 15, ' ', STR_PAD_LEFT) . "\n";
echo "  ├─ Discount:     " . str_pad($latestOrder->discount . ' EGP', 15, ' ', STR_PAD_LEFT) . "\n";
echo "  └─ TOTAL:        " . str_pad($latestOrder->total . ' EGP', 15, ' ', STR_PAD_LEFT) . " ← PAYMOB AMOUNT\n\n";

$items = $latestOrder->items;
if ($items && $items->count() > 0) {
    echo "  ORDER ITEMS ({$items->count()}):\n";
    foreach ($items as $item) {
        echo "  ├─ {$item->product_name}\n";
        echo "  │  Qty: {$item->quantity} × {$item->price} EGP = {$item->subtotal} EGP\n";
    }
    echo "\n";
}

// Check Paymob payment record
$payment = \App\Models\PaymobPayment::where('order_id', $latestOrder->id)->first();
if ($payment) {
    echo "═══════════════════════════════════════════════════════════════\n";
    echo "  PAYMOB PAYMENT RECORD\n";
    echo "═══════════════════════════════════════════════════════════════\n\n";

    $amountEGP = $payment->amount_cents / 100;
    echo "  Amount (cents): {$payment->amount_cents}\n";
    echo "  Amount (EGP):   {$amountEGP}\n";
    echo "  Status:         {$payment->status}\n";
    echo "  Created:        {$payment->created_at}\n\n";
}

echo "═══════════════════════════════════════════════════════════════\n";
echo "  MISMATCH DETECTION\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$frontendExpected = 40.52; // What user saw in screenshot
$dbActual = (float) $latestOrder->total;
$difference = $dbActual - $frontendExpected;
$multiplier = $dbActual / $frontendExpected;

if (abs($difference) > 1) {
    echo "  ❌ MISMATCH DETECTED!\n\n";
    echo "  Frontend Expected: {$frontendExpected} EGP\n";
    echo "  Database Actual:   {$dbActual} EGP\n";
    echo "  Difference:        {$difference} EGP\n";
    echo "  Multiplier:        " . number_format($multiplier, 2) . "x\n\n";

    echo "  ROOT CAUSE: Cart merge added old items to new cart\n";
    echo "  FIX NEEDED: Step 1 - Implement 'Newest Cart Wins'\n\n";
} else {
    echo "  ✓ Totals match (within 1 EGP tolerance)\n\n";
}

echo "═══════════════════════════════════════════════════════════════\n\n";

