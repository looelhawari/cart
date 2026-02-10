<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add driver-specific fields to users table.
     * Enables real-time driver tracking and zone assignment.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Driver real-time location
            $table->decimal('current_lat', 10, 8)->nullable()->after('is_vip')
                  ->comment('Driver current GPS latitude');
            $table->decimal('current_lng', 11, 8)->nullable()->after('current_lat')
                  ->comment('Driver current GPS longitude');
            $table->timestamp('location_updated_at')->nullable()->after('current_lng')
                  ->comment('Last GPS update timestamp');

            // Driver availability and assignment
            $table->boolean('is_available')->default(false)->after('location_updated_at')
                  ->comment('Driver online/offline toggle');
            $table->foreignId('assigned_zone_id')->nullable()->after('is_available')
                  ->constrained('delivery_zones')->nullOnDelete()
                  ->comment('Primary zone assignment for driver');

            // Driver vehicle info
            $table->string('vehicle_type', 50)->nullable()->after('assigned_zone_id')
                  ->comment('motorcycle, car, bicycle');
            $table->string('vehicle_plate', 20)->nullable()->after('vehicle_type');

            // Driver performance metrics
            $table->integer('total_deliveries')->default(0)->after('vehicle_plate');
            $table->decimal('average_rating', 3, 2)->default(0.00)->after('total_deliveries');

            // Indexes for driver queries
            $table->index(['current_lat', 'current_lng'], 'idx_driver_location');
            $table->index(['role', 'is_available'], 'idx_driver_availability');
            $table->index('assigned_zone_id', 'idx_driver_zone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_driver_location');
            $table->dropIndex('idx_driver_availability');
            $table->dropIndex('idx_driver_zone');
            $table->dropForeign(['assigned_zone_id']);
            $table->dropColumn([
                'current_lat',
                'current_lng',
                'location_updated_at',
                'is_available',
                'assigned_zone_id',
                'vehicle_type',
                'vehicle_plate',
                'total_deliveries',
                'average_rating',
            ]);
        });
    }
};
