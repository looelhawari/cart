<?php

namespace Database\Seeders;

use App\Models\PromoCode;
use Illuminate\Database\Seeder;

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

        $this->command->info('✅ Promo codes seeded successfully!');
        $this->command->info('Test codes: WELCOME10, SAVE20, FIRST50, SUPER30, FLAT25');
    }
}
