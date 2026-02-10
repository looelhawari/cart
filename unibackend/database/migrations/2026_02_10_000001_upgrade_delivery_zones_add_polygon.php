<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Upgrade delivery_zones table with polygon-based spatial data.
     * Enables enterprise-grade zone boundary definition with Google Maps integration.
     */
    public function up(): void
    {
        Schema::table('delivery_zones', function (Blueprint $table) {
            // Polygon coordinates stored as JSON array of {lat, lng} objects
            // Format: [{"lat": 30.0444, "lng": 31.2357}, {"lat": 30.0500, "lng": 31.2400}, ...]
            $table->json('polygon_coordinates')->nullable()->after('area');

            // Center point for map display and distance calculations
            $table->decimal('center_lat', 10, 8)->nullable()->after('polygon_coordinates');
            $table->decimal('center_lng', 11, 8)->nullable()->after('center_lat');

            // Visual customization for admin map
            $table->string('color', 7)->default('#3B82F6')->after('center_lng')
                  ->comment('Hex color for zone polygon on map');
            $table->decimal('opacity', 3, 2)->default(0.30)->after('color')
                  ->comment('Fill opacity 0.0-1.0');

            // Enhanced delivery configuration
            $table->integer('max_delivery_time_minutes')->nullable()->after('estimated_delivery_time')
                  ->comment('Max delivery time in minutes for SLA tracking');
            $table->decimal('surge_multiplier', 4, 2)->default(1.00)->after('max_delivery_time_minutes')
                  ->comment('Dynamic pricing multiplier for peak hours');
            $table->integer('max_concurrent_orders')->nullable()->after('surge_multiplier')
                  ->comment('Max orders zone can handle simultaneously');

            // Ordering and description
            $table->integer('sort_order')->default(0)->after('max_concurrent_orders');
            $table->text('description')->nullable()->after('name');
            $table->string('name_ar', 255)->nullable()->after('name')
                  ->comment('Arabic name for bilingual support');

            // Soft delete support
            $table->softDeletes();

            // Indexes
            $table->index(['center_lat', 'center_lng'], 'idx_center_coords');
            $table->index('sort_order', 'idx_sort_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_zones', function (Blueprint $table) {
            $table->dropIndex('idx_center_coords');
            $table->dropIndex('idx_sort_order');

            $table->dropColumn([
                'polygon_coordinates',
                'center_lat',
                'center_lng',
                'color',
                'opacity',
                'max_delivery_time_minutes',
                'surge_multiplier',
                'max_concurrent_orders',
                'sort_order',
                'description',
                'name_ar',
                'deleted_at',
            ]);
        });
    }
};
