<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promo_code_bogo_rules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('promo_code_id');
            $table->enum('buy_scope', ['product', 'category']);
            $table->unsignedBigInteger('buy_product_id')->nullable();
            $table->unsignedBigInteger('buy_category_id')->nullable();
            $table->boolean('buy_include_subcategories')->default(true);
            $table->unsignedInteger('buy_qty');
            $table->enum('get_scope', ['product', 'category']);
            $table->unsignedBigInteger('get_product_id')->nullable();
            $table->unsignedBigInteger('get_category_id')->nullable();
            $table->boolean('get_include_subcategories')->default(true);
            $table->unsignedInteger('get_qty');
            $table->enum('get_discount_type', ['free', 'percentage', 'fixed_amount'])->default('free');
            $table->decimal('get_discount_value', 10, 2)->default(0.00);
            $table->unsignedInteger('max_applications_per_order')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('promo_code_id')->references('id')->on('promo_codes')->onDelete('cascade');
            $table->foreign('buy_product_id')->references('barcode')->on('products')->onDelete('set null');
            $table->foreign('get_product_id')->references('barcode')->on('products')->onDelete('set null');
            $table->foreign('buy_category_id')->references('id')->on('categories')->onDelete('set null');
            $table->foreign('get_category_id')->references('id')->on('categories')->onDelete('set null');
            $table->index('promo_code_id');
            $table->index('is_active');
            $table->index('buy_scope');
            $table->index('get_scope');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_code_bogo_rules');
    }
};
