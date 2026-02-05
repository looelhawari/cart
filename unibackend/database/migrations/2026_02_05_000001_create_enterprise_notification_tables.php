<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Enterprise notification system tables for scalable 100k+ user support
     */
    public function up(): void
    {
        // Product watchlist for back-in-stock notifications
        if (!Schema::hasTable('product_watchlist')) {
            Schema::create('product_watchlist', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->unsignedBigInteger('product_id')->comment('References products.barcode');
                $table->boolean('notify_back_in_stock')->default(true);
                $table->boolean('notify_price_drop')->default(true);
                $table->decimal('price_threshold', 10, 2)->nullable(); // Alert when price drops below this
                $table->decimal('last_known_price', 10, 2)->nullable();
                $table->boolean('notified_back_in_stock')->default(false);
                $table->boolean('notified_price_drop')->default(false);
                $table->timestamp('last_notified_at')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'product_id']);
                $table->index('notify_back_in_stock');
                $table->index('notify_price_drop');
            });
        }

        // Cart abandonment tracking
        if (!Schema::hasTable('cart_reminders')) {
            Schema::create('cart_reminders', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->integer('cart_item_count')->default(0);
                $table->decimal('cart_total', 10, 2)->default(0);
                $table->timestamp('last_cart_activity')->nullable();
                $table->timestamp('reminder_1_sent_at')->nullable(); // 1 hour reminder
                $table->timestamp('reminder_2_sent_at')->nullable(); // 24 hour reminder
                $table->timestamp('reminder_3_sent_at')->nullable(); // 72 hour reminder
                $table->boolean('converted')->default(false);
                $table->timestamp('converted_at')->nullable();
                $table->timestamps();

                $table->unique('user_id');
                $table->index('last_cart_activity');
                $table->index('converted');
            });
        }

        // Notification templates for A/B testing and customization
        if (!Schema::hasTable('notification_templates')) {
            Schema::create('notification_templates', function (Blueprint $table) {
                $table->id();
                $table->string('code', 100)->unique(); // e.g., 'order_delivered', 'flash_sale_start'
                $table->string('category', 50); // order, product, promo, cart, chat, account, wallet, address, system, smart
                $table->string('priority', 20)->default('medium'); // critical, high, medium, low
                $table->string('title');
                $table->string('title_ar')->nullable();
                $table->text('message');
                $table->text('message_ar')->nullable();
                $table->string('icon', 10)->default('🔔'); // Emoji icon
                $table->string('action_type', 50)->default('navigate'); // navigate, open_url, dismiss
                $table->string('default_action_target')->nullable(); // Default deep link pattern
                $table->boolean('push_enabled')->default(true);
                $table->boolean('in_app_enabled')->default(true);
                $table->boolean('email_enabled')->default(false);
                $table->boolean('sms_enabled')->default(false);
                $table->string('sound', 50)->nullable(); // Custom sound file
                $table->boolean('vibrate')->default(true);
                $table->boolean('show_badge')->default(true);
                $table->boolean('is_active')->default(true);
                $table->json('variables')->nullable(); // List of available template variables
                $table->timestamps();

                $table->index('category');
                $table->index('priority');
                $table->index('is_active');
            });
        }

        // Notification analytics for tracking engagement
        if (!Schema::hasTable('notification_analytics')) {
            Schema::create('notification_analytics', function (Blueprint $table) {
                $table->id();
                $table->foreignId('notification_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
                $table->string('event_type', 30); // sent, delivered, opened, clicked, dismissed
                $table->string('platform', 20)->nullable(); // ios, android, web
                $table->string('app_state', 20)->nullable(); // foreground, background, killed
                $table->json('metadata')->nullable(); // Additional event data
                $table->timestamp('event_at');
                $table->timestamps();

                $table->index(['notification_id', 'event_type']);
                $table->index(['user_id', 'event_at']);
                $table->index('event_type');
            });
        }

        // User reorder patterns for smart notifications
        if (!Schema::hasTable('user_purchase_patterns')) {
            Schema::create('user_purchase_patterns', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->unsignedBigInteger('product_id')->comment('References products.barcode');
                $table->integer('purchase_count')->default(0);
                $table->integer('avg_days_between_purchases')->nullable();
                $table->timestamp('last_purchased_at')->nullable();
                $table->timestamp('next_predicted_purchase')->nullable();
                $table->boolean('reorder_reminder_sent')->default(false);
                $table->timestamp('last_reminder_sent_at')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'product_id']);
                $table->index('next_predicted_purchase');
                $table->index('reorder_reminder_sent');
            });
        }

        // Security login tracking
        if (!Schema::hasTable('user_login_history')) {
            Schema::create('user_login_history', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('ip_address', 45)->nullable();
                $table->string('user_agent')->nullable();
                $table->string('device_type', 50)->nullable(); // mobile, tablet, desktop
                $table->string('device_name')->nullable();
                $table->string('browser', 100)->nullable();
                $table->string('os', 100)->nullable();
                $table->string('country', 100)->nullable();
                $table->string('city', 100)->nullable();
                $table->boolean('is_new_device')->default(false);
                $table->boolean('is_suspicious')->default(false);
                $table->boolean('notification_sent')->default(false);
                $table->timestamp('logged_in_at');
                $table->timestamps();

                $table->index(['user_id', 'logged_in_at']);
                $table->index('is_new_device');
                $table->index('is_suspicious');
            });
        }

        // Flash sales tracking
        if (!Schema::hasTable('flash_sales')) {
            Schema::create('flash_sales', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->string('title_ar')->nullable();
                $table->text('description')->nullable();
                $table->text('description_ar')->nullable();
                $table->string('image_url')->nullable();
                $table->timestamp('starts_at');
                $table->timestamp('ends_at');
                $table->boolean('start_notification_sent')->default(false);
                $table->boolean('ending_notification_sent')->default(false); // 1 hour before end
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['starts_at', 'ends_at']);
                $table->index('is_active');
            });
        }

        // Flash sale products
        if (!Schema::hasTable('flash_sale_products')) {
            Schema::create('flash_sale_products', function (Blueprint $table) {
                $table->id();
                $table->foreignId('flash_sale_id')->constrained()->onDelete('cascade');
                $table->unsignedBigInteger('product_id')->comment('References products.barcode');
                $table->decimal('original_price', 10, 2);
                $table->decimal('sale_price', 10, 2);
                $table->integer('quantity_limit')->nullable();
                $table->integer('quantity_sold')->default(0);
                $table->timestamps();

                $table->unique(['flash_sale_id', 'product_id']);
            });
        }

        // System announcements
        if (!Schema::hasTable('system_announcements')) {
            Schema::create('system_announcements', function (Blueprint $table) {
                $table->id();
                $table->string('type', 50); // maintenance, outage, policy_update, app_update, legal_notice
                $table->string('title');
                $table->string('title_ar')->nullable();
                $table->text('message');
                $table->text('message_ar')->nullable();
                $table->string('priority', 20)->default('medium'); // critical, high, medium, low
                $table->string('action_url')->nullable();
                $table->timestamp('scheduled_at')->nullable(); // For maintenance
                $table->timestamp('resolved_at')->nullable();
                $table->boolean('notification_sent')->default(false);
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['type', 'is_active']);
                $table->index('scheduled_at');
            });
        }

        // Create notification preferences table if it doesn't exist, otherwise update it
        if (!Schema::hasTable('notification_preferences')) {
            Schema::create('notification_preferences', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->boolean('order_updates')->default(true);
                $table->boolean('delivery_updates')->default(true);
                $table->boolean('promotions')->default(true);
                $table->boolean('flash_sales')->default(true);
                $table->boolean('price_alerts')->default(true);
                $table->boolean('price_drops')->default(true);
                $table->boolean('back_in_stock')->default(true);
                $table->boolean('cart_reminders')->default(true);
                $table->boolean('reorder_reminders')->default(true);
                $table->boolean('support_updates')->default(true);
                $table->boolean('chat_messages')->default(true);
                $table->boolean('security_alerts')->default(true);
                $table->boolean('payment_alerts')->default(true);
                $table->boolean('system_updates')->default(true);
                $table->boolean('push_enabled')->default(true);
                $table->boolean('email_enabled')->default(false);
                $table->boolean('sms_enabled')->default(false);
                $table->string('quiet_hours_start', 5)->nullable(); // e.g., "22:00"
                $table->string('quiet_hours_end', 5)->nullable(); // e.g., "08:00"
                $table->timestamps();

                $table->unique('user_id');
            });
        } else {
            Schema::table('notification_preferences', function (Blueprint $table) {
                if (!Schema::hasColumn('notification_preferences', 'cart_reminders')) {
                    $table->boolean('cart_reminders')->default(true);
                }
                if (!Schema::hasColumn('notification_preferences', 'flash_sales')) {
                    $table->boolean('flash_sales')->default(true);
                }
                if (!Schema::hasColumn('notification_preferences', 'price_drops')) {
                    $table->boolean('price_drops')->default(true);
                }
                if (!Schema::hasColumn('notification_preferences', 'reorder_reminders')) {
                    $table->boolean('reorder_reminders')->default(true);
                }
                if (!Schema::hasColumn('notification_preferences', 'security_alerts')) {
                    $table->boolean('security_alerts')->default(true);
                }
                if (!Schema::hasColumn('notification_preferences', 'system_updates')) {
                    $table->boolean('system_updates')->default(true);
                }
                if (!Schema::hasColumn('notification_preferences', 'delivery_updates')) {
                    $table->boolean('delivery_updates')->default(true);
                }
                if (!Schema::hasColumn('notification_preferences', 'payment_alerts')) {
                    $table->boolean('payment_alerts')->default(true);
                }
                if (!Schema::hasColumn('notification_preferences', 'chat_messages')) {
                    $table->boolean('chat_messages')->default(true);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('flash_sale_products');
        Schema::dropIfExists('flash_sales');
        Schema::dropIfExists('system_announcements');
        Schema::dropIfExists('user_login_history');
        Schema::dropIfExists('user_purchase_patterns');
        Schema::dropIfExists('notification_analytics');
        Schema::dropIfExists('notification_templates');
        Schema::dropIfExists('cart_reminders');
        Schema::dropIfExists('product_watchlist');

        // Remove new columns from notification_preferences
        Schema::table('notification_preferences', function (Blueprint $table) {
            $columns = [
                'cart_reminders', 'flash_sales', 'price_drops', 'reorder_reminders',
                'security_alerts', 'system_updates', 'delivery_updates', 'payment_alerts', 'chat_messages'
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('notification_preferences', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
