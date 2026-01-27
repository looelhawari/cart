<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promo_code_categories', function (Blueprint $table) {
            $table->unsignedBigInteger('promo_code_id');
            $table->unsignedBigInteger('category_id');
            $table->boolean('include_subcategories')->default(true);
            $table->primary(['promo_code_id', 'category_id']);
            $table->foreign('promo_code_id')->references('id')->on('promo_codes')->onDelete('cascade');
            $table->foreign('category_id')->references('id')->on('categories')->onDelete('cascade');
            $table->index('promo_code_id');
            $table->index('category_id');
        });

        Schema::create('promo_code_products', function (Blueprint $table) {
            $table->unsignedBigInteger('promo_code_id');
            $table->unsignedBigInteger('product_id');
            $table->primary(['promo_code_id', 'product_id']);
            $table->foreign('promo_code_id')->references('id')->on('promo_codes')->onDelete('cascade');
            $table->foreign('product_id')->references('barcode')->on('products')->onDelete('cascade');
            $table->index('promo_code_id');
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_code_products');
        Schema::dropIfExists('promo_code_categories');
    }
};
