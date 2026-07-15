<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Clear phantom product discounts.
 *
 * ~655 products carried a seeded `sale_price` (a blanket ~25% off) that was
 * written directly into the products table by demo/mock data. These surfaced
 * as bogus "Flash Deals" / "-25%" badges across the app even though there was
 * NO active promotion, offer, or promo code behind them (the promotions table
 * is empty and every affected row has active_promotion_id = NULL).
 *
 * This clears only those orphaned sale prices — rows NOT backed by an active
 * promotion. `products.price` is the real selling price and is left untouched;
 * only the phantom `sale_price` discount is removed. Rows tied to a real
 * promotion (active_promotion_id set) are intentionally skipped so legitimate,
 * admin-created promotions keep working.
 */
return new class extends Migration {
    public function up(): void
    {
        DB::table('products')
            ->whereNotNull('sale_price')
            ->whereNull('active_promotion_id')
            ->update(['sale_price' => null]);
    }

    public function down(): void
    {
        // Irreversible: the removed sale prices were demo data with no real
        // promotion behind them and cannot be reconstructed. No-op so the
        // migration can still be rolled back without error.
    }
};
