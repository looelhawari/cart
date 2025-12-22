<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop foreign key if exists using raw SQL
        try {
            DB::statement('ALTER TABLE products DROP FOREIGN KEY products_ibfk_1');
        } catch (\Exception $e) {
            // Foreign key doesn't exist, ignore
        }

        // Remove brand_id column from products table
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'brand_id')) {
                $table->dropColumn('brand_id');
            }
        });

        // Drop brands table
        Schema::dropIfExists('brands');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate brands table
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('logo')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('slug');
            $table->index('is_active');
        });

        // Add brand_id back to products
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('brand_id')->nullable()->after('description_ar')->constrained('brands')->nullOnDelete();
            $table->index('brand_id');
        });
    }
};
