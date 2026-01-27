<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('delivery_zones')) {
            Schema::create('delivery_zones', function (Blueprint $table) {
                $table->id();
                $table->string('name', 255);
                $table->string('city', 100);
                $table->string('area', 255);
                $table->decimal('delivery_fee', 10, 2);
                $table->decimal('minimum_order', 10, 2)->default(0.00);
                $table->string('estimated_delivery_time', 100)->nullable()->comment('30-60 minutes');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                
                $table->index('city', 'idx_city');
                $table->index('is_active', 'idx_is_active');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_zones');
    }
};
