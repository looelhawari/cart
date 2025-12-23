<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add delivery time slots configuration to settings
        $deliverySlots = [
            [
                'slot' => '9:00 AM - 12:00 PM',
                'capacity' => 50,
                'is_active' => true
            ],
            [
                'slot' => '12:00 PM - 3:00 PM',
                'capacity' => 50,
                'is_active' => true
            ],
            [
                'slot' => '3:00 PM - 6:00 PM',
                'capacity' => 50,
                'is_active' => true
            ],
            [
                'slot' => '6:00 PM - 9:00 PM',
                'capacity' => 50,
                'is_active' => true
            ]
        ];

        DB::table('settings')->insert([
            [
                'key' => 'delivery_slots',
                'value' => json_encode($deliverySlots),
                'type' => 'json',
                'description' => 'Available delivery time slots with capacity',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('settings')->where('key', 'delivery_slots')->delete();
    }
};
