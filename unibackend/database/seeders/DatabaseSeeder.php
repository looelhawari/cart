<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Database\Seeders\ComplaintFavoriteSeeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@example.com',
            'is_verified' => true,
        ]);

        $this->call(ComplaintFavoriteSeeder::class);
        $this->call(RbacSeeder::class);
        // Store settings — idempotent, fills only missing canonical keys so
        // the admin Settings page can save without 422'ing on a fresh DB and
        // the customer /store/* endpoints return stored values, not defaults.
        $this->call(StoreSettingsSeeder::class);
    }
}
