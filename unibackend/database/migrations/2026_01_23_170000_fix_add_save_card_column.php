<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('paymob_payments', 'save_card_requested')) {
            DB::statement('ALTER TABLE paymob_payments ADD COLUMN save_card_requested TINYINT(1) DEFAULT 0 AFTER payment_method');
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('paymob_payments', 'save_card_requested')) {
            DB::statement('ALTER TABLE paymob_payments DROP COLUMN save_card_requested');
        }
    }
};
