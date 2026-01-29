<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * This migration updates the existing notifications table to support
     * the new scalable notification system (50k+ users) with:
     * - Push notification tracking
     * - Broadcast notifications
     * - User preferences with quiet hours
     */
    public function up(): void
    {
        // Update existing notifications table with new columns
        Schema::table('notifications', function (Blueprint $table) {
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('notifications', 'title_ar')) {
                $table->string('title_ar')->nullable()->after('title');
            }
            if (!Schema::hasColumn('notifications', 'message_ar')) {
                $table->text('message_ar')->nullable()->after('message');
            }
            if (!Schema::hasColumn('notifications', 'action_type')) {
                $table->string('action_type', 50)->nullable()->after('data');
            }
            if (!Schema::hasColumn('notifications', 'action_target')) {
                $table->string('action_target')->nullable()->after('action_type');
            }
            if (!Schema::hasColumn('notifications', 'image_url')) {
                $table->string('image_url')->nullable()->after('action_target');
            }
            if (!Schema::hasColumn('notifications', 'is_broadcast')) {
                $table->boolean('is_broadcast')->default(false)->after('image_url');
            }
            if (!Schema::hasColumn('notifications', 'scheduled_at')) {
                $table->timestamp('scheduled_at')->nullable()->after('read_at');
            }
            if (!Schema::hasColumn('notifications', 'sent_at')) {
                $table->timestamp('sent_at')->nullable()->after('scheduled_at');
            }
            if (!Schema::hasColumn('notifications', 'push_status')) {
                $table->string('push_status', 30)->default('pending')->after('sent_at');
            }
            if (!Schema::hasColumn('notifications', 'push_error')) {
                $table->text('push_error')->nullable()->after('push_status');
            }
        });

        // Add indexes for performance (wrapped in try-catch for existing indexes)
        try {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index('is_broadcast', 'notifications_is_broadcast_index');
            });
        } catch (\Exception $e) {
            // Index may already exist
        }

        try {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index('push_status', 'notifications_push_status_index');
            });
        } catch (\Exception $e) {
            // Index may already exist
        }

        try {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index('scheduled_at', 'notifications_scheduled_at_index');
            });
        } catch (\Exception $e) {
            // Index may already exist
        }

        // Track push notification delivery per device
        if (!Schema::hasTable('notification_deliveries')) {
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
        }

        // Notification preferences per user
        if (!Schema::hasTable('notification_preferences')) {
            Schema::create('notification_preferences', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->boolean('push_enabled')->default(true);
                $table->boolean('email_enabled')->default(true);
                $table->boolean('order_updates')->default(true);
                $table->boolean('promotions')->default(true);
                $table->boolean('wallet_updates')->default(true);
                $table->boolean('complaint_updates')->default(true);
                $table->boolean('price_alerts')->default(true);
                $table->boolean('back_in_stock')->default(true);
                $table->boolean('marketing')->default(true);
                $table->boolean('quiet_hours_enabled')->default(false);
                $table->string('quiet_hours_start', 5)->nullable()->default('22:00');
                $table->string('quiet_hours_end', 5)->nullable()->default('08:00');
                $table->string('timezone')->nullable();
                $table->timestamps();

                $table->unique('user_id');
            });
        }

        // Track user read status for broadcast notifications
        if (!Schema::hasTable('notification_reads')) {
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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_reads');
        Schema::dropIfExists('notification_preferences');
        Schema::dropIfExists('notification_deliveries');

        // Remove added columns from notifications table
        Schema::table('notifications', function (Blueprint $table) {
            $columns = [
                'title_ar', 'message_ar', 'action_type', 'action_target',
                'image_url', 'is_broadcast', 'scheduled_at', 'sent_at',
                'push_status', 'push_error'
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('notifications', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        // Remove indexes
        try {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropIndex('notifications_is_broadcast_index');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropIndex('notifications_push_status_index');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropIndex('notifications_scheduled_at_index');
            });
        } catch (\Exception $e) {}
    }
};
