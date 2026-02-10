<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add zone tracking and delivery coordinates to orders.
     * Captures the zone + exact coordinates at order time for analytics & driver routing.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Delivery zone at time of order (snapshot for analytics)
            $table->foreignId('delivery_zone_id')->nullable()->after('delivery_address_id')
                  ->constrained('delivery_zones')->nullOnDelete()
                  ->comment('Zone at order creation time - immutable snapshot');

            // Exact delivery coordinates (snapshot from address at order time)
            $table->decimal('delivery_lat', 10, 8)->nullable()->after('delivery_zone_id')
                  ->comment('Delivery latitude - frozen at order time');
            $table->decimal('delivery_lng', 11, 8)->nullable()->after('delivery_lat')
                  ->comment('Delivery longitude - frozen at order time');

            // Zone delivery fee at order time (may differ from current zone fee)
            $table->string('zone_name', 255)->nullable()->after('delivery_lng')
                  ->comment('Zone name snapshot for display');

            // Driver assignment
            $table->foreignId('driver_id')->nullable()->after('zone_name')
                  ->constrained('users')->nullOnDelete()
                  ->comment('Assigned delivery driver');
            $table->timestamp('driver_assigned_at')->nullable()->after('driver_id');
            $table->timestamp('driver_picked_up_at')->nullable()->after('driver_assigned_at');
            $table->timestamp('actual_delivered_at')->nullable()->after('driver_picked_up_at');

            // Estimated delivery time from zone config
            $table->integer('estimated_delivery_minutes')->nullable()->after('actual_delivered_at')
                  ->comment('From zone config at order time');

            // Indexes
            $table->index('delivery_zone_id', 'idx_order_zone');
            $table->index('driver_id', 'idx_order_driver');
            $table->index(['delivery_lat', 'delivery_lng'], 'idx_order_delivery_coords');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('idx_order_zone');
            $table->dropIndex('idx_order_driver');
            $table->dropIndex('idx_order_delivery_coords');
            $table->dropForeign(['delivery_zone_id']);
            $table->dropForeign(['driver_id']);
            $table->dropColumn([
                'delivery_zone_id',
                'delivery_lat',
                'delivery_lng',
                'zone_name',
                'driver_id',
                'driver_assigned_at',
                'driver_picked_up_at',
                'actual_delivered_at',
                'estimated_delivery_minutes',
            ]);
        });
    }
};
