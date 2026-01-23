<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentMethod;
use App\Models\User;
use Carbon\Carbon;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get the first user (or create a test user)
        $user = User::first();

        if (!$user) {
            $user = User::create([
                'first_name' => 'Test',
                'last_name' => 'User',
                'email' => 'test@example.com',
                'phone' => '+201234567890',
                'password' => bcrypt('password'),
                'is_verified' => true,
                'is_active' => true,
            ]);
        }

        // Clear existing payment methods for this user
        PaymentMethod::where('user_id', $user->id)->delete();

        // Create fake payment methods
        $paymentMethods = [
            [
                'user_id' => $user->id,
                'type' => 'card',
                'token' => 'tok_' . bin2hex(random_bytes(16)),
                'card_brand' => 'visa',
                'card_last_four' => '4242',
                'is_verified' => true,
                'is_default' => true,
                'expires_at' => Carbon::create(2028, 12, 31),
            ],
            [
                'user_id' => $user->id,
                'type' => 'card',
                'token' => 'tok_' . bin2hex(random_bytes(16)),
                'card_brand' => 'mastercard',
                'card_last_four' => '5555',
                'is_verified' => true,
                'is_default' => false,
                'expires_at' => Carbon::create(2027, 6, 30),
            ],
            [
                'user_id' => $user->id,
                'type' => 'card',
                'token' => 'tok_' . bin2hex(random_bytes(16)),
                'card_brand' => 'amex',
                'card_last_four' => '1000',
                'is_verified' => true,
                'is_default' => false,
                'expires_at' => Carbon::create(2026, 3, 31),
            ],
            [
                'user_id' => $user->id,
                'type' => 'card',
                'token' => 'tok_' . bin2hex(random_bytes(16)),
                'card_brand' => 'visa',
                'card_last_four' => '1111',
                'is_verified' => true,
                'is_default' => false,
                'expires_at' => Carbon::create(2025, 1, 31), // Expired
            ],
        ];

        foreach ($paymentMethods as $method) {
            PaymentMethod::create($method);
        }

        $this->command->info('✅ Created ' . count($paymentMethods) . ' fake payment methods for user: ' . $user->email);
    }
}
