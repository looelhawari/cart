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
        // Main notifications table
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('type', 50); // order, promo, account, support, wallet, product
            $table->string('title');
            $table->string('title_ar')->nullable();
            $table->text('message');
            $table->text('message_ar')->nullable();
            $table->json('data')->nullable(); // Extra data (order_id, promo_id, etc.)
            $table->string('action_type', 50)->nullable(); // navigate, open_url, dismiss
            $table->string('action_target')->nullable(); // /orders/123, /promotions/5
            $table->string('image_url')->nullable();
            $table->boolean('is_broadcast')->default(false);
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->string('push_status', 30)->default('pending'); // pending, queued, processing, sent, failed
            $table->text('push_error')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_read']);
            $table->index(['type', 'created_at']);
            $table->index('is_broadcast');
            $table->index('push_status');
            $table->index('scheduled_at');
        });

        // Track push notification delivery per device
        Schema::create('notification_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('notification_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('device_token');
            $table->string('platform', 20); // ios, android
            $table->string('status', 20)->default('pending'); // pending, sent, delivered, failed
            $table->string('ticket_id')->nullable(); // Expo ticket ID for receipt checking
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->index(['notification_id', 'status']);
            $table->index('ticket_id');
            $table->index(['user_id', 'created_at']);
        });

        // Notification preferences per user
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->boolean('push_enabled')->default(true);
            $table->boolean('email_enabled')->default(true);
            $table->boolean('order_updates')->default(true);
            $table->boolean('promotions')->default(true);
            $table->boolean('price_alerts')->default(true);
            $table->boolean('back_in_stock')->default(true);
            $table->boolean('support_updates')->default(true);
            $table->boolean('marketing')->default(true);
            $table->json('quiet_hours')->nullable(); // {"start": "22:00", "end": "08:00"}
            $table->string('timezone')->nullable();
            $table->timestamps();

            $table->unique('user_id');
        });

        // Track user read status for broadcast notifications
        Schema::create('notification_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('notification_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamp('read_at');
            $table->timestamps();

            $table->unique(['notification_id', 'user_id']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_reads');
        Schema::dropIfExists('notification_deliveries');
        Schema::dropIfExists('notification_preferences');
        Schema::dropIfExists('notifications');
    }
};
