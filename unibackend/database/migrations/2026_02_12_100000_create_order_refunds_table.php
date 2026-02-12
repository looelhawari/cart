<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_refunds', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('paymob_payment_id')->nullable();

            // Refund type & amounts
            $table->enum('type', ['full', 'partial', 'penalty'])->default('full');
            $table->decimal('original_amount', 10, 2);   // Original order/item total
            $table->decimal('penalty_percent', 5, 2)->default(0);  // e.g. 14.00
            $table->decimal('penalty_amount', 10, 2)->default(0);  // Calculated deduction
            $table->decimal('refund_amount', 10, 2);     // Actual amount refunded

            // Paymob refund tracking
            $table->string('paymob_transaction_id')->nullable();   // Original payment txn ID
            $table->string('paymob_refund_id')->nullable();        // Refund txn ID from Paymob
            $table->string('refund_method')->default('paymob');    // 'paymob' or 'wallet' or 'none'

            // Status tracking
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->text('reason')->nullable();
            $table->text('failure_reason')->nullable();

            // Audit
            $table->string('initiated_by')->default('customer'); // 'customer' or 'admin'
            $table->unsignedBigInteger('admin_id')->nullable();
            $table->json('paymob_response')->nullable();
            $table->json('refunded_items')->nullable();  // For partial refunds: [{item_id, product_name, qty, amount}]

            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders');
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('paymob_payment_id')->references('id')->on('paymob_payments');

            $table->index('order_id');
            $table->index('user_id');
            $table->index('status');
            $table->index('paymob_refund_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_refunds');
    }
};
