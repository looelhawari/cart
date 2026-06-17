<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Broadcast notifications (promotions, offers, flash sales, app updates,
 * maintenance) are stored as a single row with user_id = NULL and
 * is_broadcast = true. The column was created NOT NULL, so every broadcast
 * insert threw "Column 'user_id' cannot be null" — which is why no broadcast
 * notification had ever been created. Make user_id nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });
    }
};
