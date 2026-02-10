<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add GPS coordinates to addresses for zone-based delivery validation.
     * Latitude/longitude are captured via Google Maps picker on mobile app.
     */
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            // GPS coordinates from Google Maps picker
            $table->decimal('latitude', 10, 8)->nullable()->after('landmark')
                  ->comment('GPS latitude from map picker');
            $table->decimal('longitude', 11, 8)->nullable()->after('latitude')
                  ->comment('GPS longitude from map picker');

            // Resolved delivery zone (auto-detected from coordinates)
            $table->foreignId('delivery_zone_id')->nullable()->after('longitude')
                  ->constrained('delivery_zones')->nullOnDelete()
                  ->comment('Auto-resolved zone based on coordinates');

            // Google Maps formatted address for verification
            $table->string('formatted_address', 500)->nullable()->after('delivery_zone_id')
                  ->comment('Google Maps reverse geocoded address string');

            // Google Maps Place ID for exact location reference
            $table->string('place_id', 255)->nullable()->after('formatted_address')
                  ->comment('Google Maps Place ID for geocoding cache');

            // Indexes for spatial lookups
            $table->index(['latitude', 'longitude'], 'idx_address_coords');
            $table->index('delivery_zone_id', 'idx_address_zone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropIndex('idx_address_coords');
            $table->dropIndex('idx_address_zone');
            $table->dropForeign(['delivery_zone_id']);
            $table->dropColumn([
                'latitude',
                'longitude',
                'delivery_zone_id',
                'formatted_address',
                'place_id',
            ]);
        });
    }
};
