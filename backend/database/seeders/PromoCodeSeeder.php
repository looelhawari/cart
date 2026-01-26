<?php

namespace Database\Seeders;

use App\Models\PromoCode;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PromoCodeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $promoCodes = [
            [
                'code' => 'WELCOME10',
                'type' => 'percentage',
                'applies_to' => 'order',
                'first_order_only' => false,
                'value' => 10,
                'minimum_order' => 50.00,
                'maximum_discount' => 20.00,
                'usage_limit' => 1000,
                'usage_per_user' => 1,
                'valid_from' => now(),
                'valid_until' => now()->addMonths(3),
                'is_active' => true,
                'used_count' => 0,
            ],
            [
                'code' => 'SAVE20',
                'type' => 'percentage',
                'applies_to' => 'order',
                'first_order_only' => false,
                'value' => 20,
                'minimum_order' => 100.00,
                'maximum_discount' => 50.00,
                'usage_limit' => 500,
                'usage_per_user' => 2,
                'valid_from' => now(),
                'valid_until' => now()->addMonths(2),
                'is_active' => true,
                'used_count' => 0,
            ],
            [
                'code' => 'FIRST50',
                'type' => 'fixed_amount',
                'applies_to' => 'order',
                'first_order_only' => true,
                'value' => 50,
                'minimum_order' => 200.00,
                'maximum_discount' => null,
                'usage_limit' => 200,
                'usage_per_user' => 1,
                'valid_from' => now(),
                'valid_until' => now()->addMonth(),
                'is_active' => true,
                'used_count' => 0,
            ],
            [
                'code' => 'SUPER30',
                'type' => 'percentage',
                'applies_to' => 'order',
                'first_order_only' => false,
                'value' => 30,
                'minimum_order' => 300.00,
                'maximum_discount' => 100.00,
                'usage_limit' => 100,
                'usage_per_user' => 1,
                'valid_from' => now(),
                'valid_until' => now()->addWeeks(2),
                'is_active' => true,
                'used_count' => 0,
            ],
            [
                'code' => 'FLAT25',
                'type' => 'fixed_amount',
                'applies_to' => 'order',
                'first_order_only' => false,
                'value' => 25,
                'minimum_order' => 150.00,
                'maximum_discount' => null,
                'usage_limit' => null,
                'usage_per_user' => 5,
                'valid_from' => now(),
                'valid_until' => now()->addMonths(6),
                'is_active' => true,
                'used_count' => 0,
            ],
            [
                'code' => 'EXPIRED',
                'type' => 'percentage',
                'applies_to' => 'order',
                'first_order_only' => false,
                'value' => 50,
                'minimum_order' => 100.00,
                'maximum_discount' => 50.00,
                'usage_limit' => 100,
                'usage_per_user' => 1,
                'valid_from' => now()->subMonths(2),
                'valid_until' => now()->subMonth(),
                'is_active' => false,
                'used_count' => 0,
            ],
        ];

        foreach ($promoCodes as $promo) {
            PromoCode::updateOrCreate(
                ['code' => $promo['code']],
                $promo
            );
        }

        $categories = DB::table('categories')
            ->orderBy('id')
            ->limit(2)
            ->pluck('id')
            ->map(fn($id) => (int) $id)
            ->all();
        $products = DB::table('products')
            ->orderBy('barcode')
            ->limit(3)
            ->pluck('barcode')
            ->map(fn($id) => (int) $id)
            ->all();

        $categoryPromo = PromoCode::updateOrCreate(
            ['code' => 'CAT10'],
            [
                'code' => 'CAT10',
                'type' => 'percentage',
                'applies_to' => 'category',
                'first_order_only' => false,
                'value' => 10,
                'minimum_order' => 0.00,
                'maximum_discount' => 50.00,
                'usage_limit' => null,
                'usage_per_user' => 5,
                'valid_from' => now(),
                'valid_until' => now()->addMonths(3),
                'is_active' => true,
                'used_count' => 0,
            ]
        );

        if (!empty($categories)) {
            foreach ($categories as $categoryId) {
                DB::table('promo_code_categories')->updateOrInsert(
                    ['promo_code_id' => $categoryPromo->id, 'category_id' => $categoryId],
                    ['include_subcategories' => true]
                );
            }
        }

        $productPromo = PromoCode::updateOrCreate(
            ['code' => 'PROD10'],
            [
                'code' => 'PROD10',
                'type' => 'fixed_amount',
                'applies_to' => 'product',
                'first_order_only' => false,
                'value' => 10.00,
                'minimum_order' => 0.00,
                'maximum_discount' => 100.00,
                'usage_limit' => null,
                'usage_per_user' => 5,
                'valid_from' => now(),
                'valid_until' => now()->addMonths(3),
                'is_active' => true,
                'used_count' => 0,
            ]
        );

        if (!empty($products)) {
            foreach ($products as $productId) {
                DB::table('promo_code_products')->updateOrInsert(
                    ['promo_code_id' => $productPromo->id, 'product_id' => $productId],
                    []
                );
            }
        }

        PromoCode::updateOrCreate(
            ['code' => 'FREEDEL'],
            [
                'code' => 'FREEDEL',
                'type' => 'free_delivery',
                'applies_to' => 'order',
                'first_order_only' => false,
                'value' => 0.00,
                'minimum_order' => 0.00,
                'maximum_discount' => null,
                'usage_limit' => null,
                'usage_per_user' => 5,
                'valid_from' => now(),
                'valid_until' => now()->addMonths(3),
                'is_active' => true,
                'used_count' => 0,
            ]
        );

        PromoCode::updateOrCreate(
            ['code' => 'FIRSTORDER'],
            [
                'code' => 'FIRSTORDER',
                'type' => 'percentage',
                'applies_to' => 'order',
                'first_order_only' => true,
                'value' => 15,
                'minimum_order' => 0.00,
                'maximum_discount' => 50.00,
                'usage_limit' => null,
                'usage_per_user' => 1,
                'valid_from' => now(),
                'valid_until' => now()->addMonths(2),
                'is_active' => true,
                'used_count' => 0,
            ]
        );

        $bogoPromo = PromoCode::updateOrCreate(
            ['code' => 'BOGO1'],
            [
                'code' => 'BOGO1',
                'type' => 'bogo',
                'applies_to' => 'order',
                'first_order_only' => false,
                'value' => 0.00,
                'minimum_order' => 0.00,
                'maximum_discount' => null,
                'usage_limit' => null,
                'usage_per_user' => 5,
                'valid_from' => now(),
                'valid_until' => now()->addMonths(3),
                'is_active' => true,
                'used_count' => 0,
            ]
        );

        if (count($products) >= 2) {
            DB::table('promo_code_bogo_rules')->updateOrInsert(
                ['promo_code_id' => $bogoPromo->id],
                [
                    'buy_scope' => 'product',
                    'buy_product_id' => $products[0],
                    'buy_category_id' => null,
                    'buy_include_subcategories' => true,
                    'buy_qty' => 2,
                    'get_scope' => 'product',
                    'get_product_id' => $products[1],
                    'get_category_id' => null,
                    'get_include_subcategories' => true,
                    'get_qty' => 1,
                    'get_discount_type' => 'free',
                    'get_discount_value' => 0.00,
                    'max_applications_per_order' => 3,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $this->command->info('Promo codes seeded successfully.');
        $this->command->info('Test codes: WELCOME10, SAVE20, FIRST50, SUPER30, FLAT25, CAT10, PROD10, FREEDEL, FIRSTORDER, BOGO1');
    }
}
