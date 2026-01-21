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
        // Add refund tracking fields to orders table
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                // Change payment_status enum to include refund states
                DB::statement("ALTER TABLE orders MODIFY COLUMN payment_status ENUM('pending', 'completed', 'failed', 'refunded', 'partially_refunded') DEFAULT 'pending'");

                if (!Schema::hasColumn('orders', 'refunded_amount')) {
                    $table->decimal('refunded_amount', 10, 2)->default(0)->after('total');
                }
                if (!Schema::hasColumn('orders', 'refunded_at')) {
                    $table->timestamp('refunded_at')->nullable()->after('cancelled_at');
                }
                if (!Schema::hasColumn('orders', 'refund_reason')) {
                    $table->text('refund_reason')->nullable()->after('refunded_at');
                }
                if (!Schema::hasColumn('orders', 'refunded_by')) {
                    $table->unsignedBigInteger('refunded_by')->nullable()->after('refund_reason')->comment('Admin user ID who initiated refund');
                    $table->foreign('refunded_by')->references('id')->on('users')->onDelete('set null');
                }
            });
        }

        // Create refund_locks table for idempotency
        if (!Schema::hasTable('refund_locks')) {
            Schema::create('refund_locks', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('order_id')->unique();
                $table->string('lock_key')->unique();
                $table->timestamp('created_at');

                $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            });
        }

        // Add refunded flag to order_items for partial refunds
        if (Schema::hasTable('order_items')) {
            Schema::table('order_items', function (Blueprint $table) {
                if (!Schema::hasColumn('order_items', 'refunded')) {
                    $table->boolean('refunded')->default(false)->after('subtotal');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropForeign(['refunded_by']);
                $table->dropColumn(['refunded_amount', 'refunded_at', 'refund_reason', 'refunded_by']);

                DB::statement("ALTER TABLE orders MODIFY COLUMN payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending'");
            });
        }

        Schema::dropIfExists('refund_locks');

        if (Schema::hasTable('order_items')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropColumn('refunded');
            });
        }
    }
};
