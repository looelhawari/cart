<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fix promotions table to match expected schema.
     * The actual DB has old columns (name, starts_at, ends_at, type, priority, banner_image)
     * but the model/migration expect (title, start_date, end_date, etc.)
     */
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            // Rename existing columns to match the expected schema
            if (Schema::hasColumn('promotions', 'name') && !Schema::hasColumn('promotions', 'title')) {
                $table->renameColumn('name', 'title');
            }
            if (Schema::hasColumn('promotions', 'starts_at') && !Schema::hasColumn('promotions', 'start_date')) {
                $table->renameColumn('starts_at', 'start_date');
            }
            if (Schema::hasColumn('promotions', 'ends_at') && !Schema::hasColumn('promotions', 'end_date')) {
                $table->renameColumn('ends_at', 'end_date');
            }
            if (Schema::hasColumn('promotions', 'banner_image') && !Schema::hasColumn('promotions', 'banner_image_url')) {
                $table->renameColumn('banner_image', 'banner_image_url');
            }
        });

        Schema::table('promotions', function (Blueprint $table) {
            // Add missing columns
            if (!Schema::hasColumn('promotions', 'title_ar')) {
                $table->string('title_ar')->default('')->after('title');
            }
            if (!Schema::hasColumn('promotions', 'description_ar')) {
                $table->text('description_ar')->nullable()->after('description');
            }
            if (!Schema::hasColumn('promotions', 'image_url')) {
                $table->string('image_url')->nullable()->after('description_ar');
            }
            if (!Schema::hasColumn('promotions', 'is_featured')) {
                $table->boolean('is_featured')->default(false)->after('is_active');
            }
            if (!Schema::hasColumn('promotions', 'applies_to')) {
                $table->enum('applies_to', ['all', 'category', 'products'])->default('all')->after('is_featured');
            }
            if (!Schema::hasColumn('promotions', 'terms_conditions')) {
                $table->text('terms_conditions')->nullable()->after('max_discount');
            }
            if (!Schema::hasColumn('promotions', 'terms_conditions_ar')) {
                $table->text('terms_conditions_ar')->nullable()->after('terms_conditions');
            }
            if (!Schema::hasColumn('promotions', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('terms_conditions_ar');
            }

            // Drop old columns that don't belong
            if (Schema::hasColumn('promotions', 'type')) {
                $table->dropColumn('type');
            }
            if (Schema::hasColumn('promotions', 'priority')) {
                $table->dropColumn('priority');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            // Reverse renames
            if (Schema::hasColumn('promotions', 'title') && !Schema::hasColumn('promotions', 'name')) {
                $table->renameColumn('title', 'name');
            }
            if (Schema::hasColumn('promotions', 'start_date') && !Schema::hasColumn('promotions', 'starts_at')) {
                $table->renameColumn('start_date', 'starts_at');
            }
            if (Schema::hasColumn('promotions', 'end_date') && !Schema::hasColumn('promotions', 'ends_at')) {
                $table->renameColumn('end_date', 'ends_at');
            }
            if (Schema::hasColumn('promotions', 'banner_image_url') && !Schema::hasColumn('promotions', 'banner_image')) {
                $table->renameColumn('banner_image_url', 'banner_image');
            }
        });
    }
};
