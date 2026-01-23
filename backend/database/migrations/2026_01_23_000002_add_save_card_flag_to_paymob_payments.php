<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds save_card_requested flag to paymob_payments table.
     * This tracks whether user opted to save their card during payment initiation.
     */
    public function up(): void
    {
        Schema::table('paymob_payments', function (Blueprint $table) {
            // Add save_card_requested flag
            $table->boolean('save_card_requested')->default(false)->after('payment_method')
                ->comment('True if user checked "Save this card"');
            $table->dropColumn('save_card_requested');
        });
    }
};
