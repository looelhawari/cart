<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('paymob_payments', function (Blueprint $table) {
            $table->id();

            // Internal references
            $table->foreignId('order_id')->constrained('orders')->onDelete('restrict');
            $table->string('internal_order_id')->unique()->comment('Our internal order reference');

            // Paymob references
            $table->string('paymob_order_id')->nullable()->comment('Paymob order ID from API');
            $table->string('paymob_transaction_id')->nullable()->unique()->comment('From callback');

            // Payment details
            $table->integer('amount_cents')->comment('Amount in cents (EGP × 100)');
            $table->string('currency', 3)->default('EGP');
            $table->enum('payment_method', ['CARD', 'WALLET'])->comment('CARD or WALLET');
            $table->string('integration_id')->comment('Paymob integration ID used');

            // Status tracking
            $table->enum('status', ['PENDING', 'PAID', 'FAILED', 'REFUNDED'])->default('PENDING');

            // Customer billing data (required by Paymob)
            $table->json('billing_data')->comment('Customer billing information');

            // Paymob responses
            $table->json('paymob_response')->nullable()->comment('Full Paymob callback data');
            $table->text('payment_token')->nullable()->comment('Generated payment key');

            // Error tracking
            $table->text('error_message')->nullable();

            // Timestamps
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('internal_order_id');
            $table->index('paymob_order_id');
            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('paymob_payments');
    }
};
