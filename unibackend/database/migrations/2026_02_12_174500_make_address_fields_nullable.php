<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Make recipient_name, phone, postal_code, and notes nullable
     * since they were added to database manually without proper migration.
     */
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            // Make these columns nullable if they exist
            if (Schema::hasColumn('addresses', 'recipient_name')) {
                $table->string('recipient_name', 255)->nullable()->change();
            }
            if (Schema::hasColumn('addresses', 'phone')) {
                $table->string('phone', 20)->nullable()->change();
            }
            if (Schema::hasColumn('addresses', 'postal_code')) {
                $table->string('postal_code', 20)->nullable()->change();
            }
            if (Schema::hasColumn('addresses', 'notes')) {
                $table->text('notes')->nullable()->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            // Make them NOT NULL again (if they exist)
            if (Schema::hasColumn('addresses', 'recipient_name')) {
                $table->string('recipient_name', 255)->nullable(false)->change();
            }
            if (Schema::hasColumn('addresses', 'phone')) {
                $table->string('phone', 20)->nullable(false)->change();
            }
            if (Schema::hasColumn('addresses', 'postal_code')) {
                $table->string('postal_code', 20)->nullable(false)->change();
            }
            if (Schema::hasColumn('addresses', 'notes')) {
                $table->text('notes')->nullable(false)->change();
            }
        });
    }
};
