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
        // 1. Expand rating_type ENUM to include 'driver' and 'customer'
        DB::statement("ALTER TABLE reviews MODIFY COLUMN rating_type ENUM('product','order','store','driver','customer') NOT NULL DEFAULT 'product'");

        // 2. Add rated_user_id column — who is being rated (the driver or the customer)
        Schema::table('reviews', function (Blueprint $table) {
            $table->unsignedBigInteger('rated_user_id')->nullable()->after('user_id');
            $table->foreign('rated_user_id')->references('id')->on('users')->onDelete('set null');

            // Make product_id nullable (driver/customer ratings don't have a product)
            $table->unsignedBigInteger('product_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['rated_user_id']);
            $table->dropColumn('rated_user_id');
        });

        DB::statement("ALTER TABLE reviews MODIFY COLUMN rating_type ENUM('product','order','store') NOT NULL DEFAULT 'product'");
    }
};
