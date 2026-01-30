<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promo_codes', function (Blueprint $table) {
            $table->string('target_audience')->nullable()->after('applies_to');
            $table->text('promotional_message')->nullable()->after('target_audience');
            $table->text('promotional_message_ar')->nullable()->after('promotional_message');
            $table->decimal('minimum_spend_30days', 10, 2)->nullable();
            $table->integer('minimum_orders_30days')->nullable();
            $table->date('last_order_date_from')->nullable();
            $table->date('last_order_date_to')->nullable();
            $table->date('registration_date_from')->nullable();
            $table->date('registration_date_to')->nullable();
            $table->string('location')->nullable();
            $table->json('specific_user_ids')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('promo_codes', function (Blueprint $table) {
            $table->dropColumn([
                'target_audience',
                'promotional_message',
                'promotional_message_ar',
                'minimum_spend_30days',
                'minimum_orders_30days',
                'last_order_date_from',
                'last_order_date_to',
                'registration_date_from',
                'registration_date_to',
                'location',
                'specific_user_ids'
            ]);
        });
    }
};
