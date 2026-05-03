<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds recipient_name, phone, postal_code, and notes to addresses if missing.
     * These were originally added directly in production without a migration; this
     * backfills the schema so `migrate:fresh` produces the same shape as prod.
     */
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            if (!Schema::hasColumn('addresses', 'recipient_name')) {
                $table->string('recipient_name', 255)->nullable()->after('label');
            }
            if (!Schema::hasColumn('addresses', 'phone')) {
                $table->string('phone', 20)->nullable()->after('recipient_name');
            }
            if (!Schema::hasColumn('addresses', 'postal_code')) {
                $table->string('postal_code', 20)->nullable()->after('area');
            }
            if (!Schema::hasColumn('addresses', 'notes')) {
                $table->text('notes')->nullable()->after('landmark');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            foreach (['recipient_name', 'phone', 'postal_code', 'notes'] as $column) {
                if (Schema::hasColumn('addresses', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
