<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * SECURITY HARDENING (audit H1):
     * paymob_payments.amount_cents was a signed INT (max 2,147,483,647 cents
     * = 21,474.83 EGP). Any single transaction at or above ~21,475 EGP would
     * silently truncate or corrupt the row.
     *
     * Widen to UNSIGNED BIGINT to safely hold any reasonable transaction
     * amount and rule out an entire class of integer-overflow bugs.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE paymob_payments MODIFY COLUMN amount_cents BIGINT UNSIGNED NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE paymob_payments MODIFY COLUMN amount_cents INT NOT NULL');
    }
};
