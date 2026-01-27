<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\User;
use Illuminate\Database\Seeder;

class AddressSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get test user (assuming user with ID 1 exists)
        $user = User::first();

        if (!$user) {
            $this->command->warn('⚠️  No users found. Please run UserSeeder first.');
            return;
        }

        $addresses = [
            [
                'user_id' => $user->id,
                'label' => 'Home',
                'street' => '123 Main Street, Building A, Floor 3, Apt 301, Nasr City - Near City Stars Mall',
                'city' => 'Cairo',
                'is_default' => true,
            ],
            [
                'user_id' => $user->id,
                'label' => 'Work',
                'street' => '456 Business Street, Tower B, Floor 10, Office 1001, New Cairo - Next to AUC campus',
                'city' => 'Cairo',
                'is_default' => false,
            ],
            [
                'user_id' => $user->id,
                'label' => 'Parents',
                'street' => '789 Family Avenue, Villa 15, 6th October City - Opposite Dream Park',
                'city' => 'Giza',
                'is_default' => false,
            ],
        ];

        foreach ($addresses as $address) {
            Address::updateOrCreate(
                [
                    'user_id' => $address['user_id'],
                    'label' => $address['label'],
                ],
                $address
            );
        }

        $this->command->info("✅ Addresses seeded successfully for user: {$user->email}");
    }
}
