<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Extend enum to include bogo
        try {
            DB::statement("ALTER TABLE promo_codes MODIFY type ENUM('percentage','fixed_amount','free_delivery','bogo') NOT NULL");
        } catch (\Throwable $e) {
            // Ignore if already updated
        }

        if (!Schema::hasColumn('promo_codes', 'applies_to')) {
            Schema::table('promo_codes', function (Blueprint $table) {
                $table->enum('applies_to', ['order', 'category', 'product'])->default('order')->after('type');
            });
        }

        if (!Schema::hasColumn('promo_codes', 'first_order_only')) {
            Schema::table('promo_codes', function (Blueprint $table) {
                $table->boolean('first_order_only')->default(false)->after('applies_to');
            });
        }

        // Indexes (safe guards via try/catch)
        try {
            DB::statement('CREATE INDEX idx_type ON promo_codes (type)');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('CREATE INDEX idx_is_active ON promo_codes (is_active)');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('CREATE INDEX idx_first_order_only ON promo_codes (first_order_only)');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('CREATE INDEX idx_valid_from ON promo_codes (valid_from)');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('CREATE INDEX idx_valid_until ON promo_codes (valid_until)');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('CREATE INDEX idx_applies_to ON promo_codes (applies_to)');
        } catch (\Throwable $e) {
        }
    }

    public function down(): void
    {
        // Non-destructive: no down migration to avoid data loss
    }
};
