<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create driver_location_history table for route tracking and analytics.
     */
    public function up(): void
    {
        Schema::create('driver_location_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->decimal('speed', 6, 2)->nullable()->comment('km/h');
            $table->decimal('heading', 6, 2)->nullable()->comment('0-360 degrees');
            $table->decimal('accuracy', 8, 2)->nullable()->comment('GPS accuracy in meters');
            $table->timestamp('recorded_at');
            $table->timestamps();

            // Indexes for efficient querying
            $table->index(['driver_id', 'recorded_at'], 'idx_driver_location_time');
            $table->index(['order_id', 'recorded_at'], 'idx_order_location_time');
        });

        Schema::create('delivery_zone_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_zone_id')->constrained('delivery_zones')->cascadeOnDelete();
            $table->tinyInteger('day_of_week')->comment('0=Sunday, 6=Saturday');
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('is_active')->default(true);
            $table->decimal('surge_multiplier', 4, 2)->default(1.00)
                  ->comment('Time-based surge for this schedule slot');
            $table->timestamps();

            $table->unique(['delivery_zone_id', 'day_of_week', 'start_time'], 'uniq_zone_day_start');
            $table->index('day_of_week', 'idx_schedule_day');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_zone_schedules');
        Schema::dropIfExists('driver_location_history');
    }
};
