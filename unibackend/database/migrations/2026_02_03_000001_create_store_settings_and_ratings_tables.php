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
        // Create store_settings table for working hours and store status
        if (!Schema::hasTable('store_settings')) {
            Schema::create('store_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique();
                $table->string('type')->default('string'); // string, json, boolean, number, time
                $table->text('value');
                $table->text('description_en')->nullable();
                $table->text('description_ar')->nullable();
                $table->string('category')->default('general'); // general, working_hours, notifications
                $table->boolean('is_public')->default(false); // Can be fetched by mobile app
                $table->timestamps();
            });

            // Insert default store settings
            DB::table('store_settings')->insert([
                [
                'key' => 'store_open_time',
                'type' => 'time',
                'value' => '11:00',
                'description_en' => 'Store opening time',
                'description_ar' => 'وقت فتح المتجر',
                'category' => 'working_hours',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'store_close_time',
                'type' => 'time',
                'value' => '00:00',
                'description_en' => 'Store closing time (midnight)',
                'description_ar' => 'وقت إغلاق المتجر (منتصف الليل)',
                'category' => 'working_hours',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'is_store_temporarily_closed',
                'type' => 'boolean',
                'value' => 'false',
                'description_en' => 'Temporarily close the store',
                'description_ar' => 'إغلاق المتجر مؤقتاً',
                'category' => 'working_hours',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'temporary_closure_reason_en',
                'type' => 'string',
                'value' => '',
                'description_en' => 'Reason for temporary closure (English)',
                'description_ar' => 'سبب الإغلاق المؤقت (إنجليزي)',
                'category' => 'working_hours',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'temporary_closure_reason_ar',
                'type' => 'string',
                'value' => '',
                'description_en' => 'Reason for temporary closure (Arabic)',
                'description_ar' => 'سبب الإغلاق المؤقت (عربي)',
                'category' => 'working_hours',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'accept_orders_outside_hours',
                'type' => 'boolean',
                'value' => 'false',
                'description_en' => 'Accept orders outside working hours',
                'description_ar' => 'قبول الطلبات خارج ساعات العمل',
                'category' => 'working_hours',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'minimum_order_amount',
                'type' => 'number',
                'value' => '50',
                'description_en' => 'Minimum order amount in EGP',
                'description_ar' => 'الحد الأدنى للطلب بالجنيه',
                'category' => 'general',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'delivery_fee',
                'type' => 'number',
                'value' => '20',
                'description_en' => 'Default delivery fee in EGP',
                'description_ar' => 'رسوم التوصيل الافتراضية بالجنيه',
                'category' => 'general',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'free_delivery_threshold',
                'type' => 'number',
                'value' => '200',
                'description_en' => 'Free delivery for orders above this amount',
                'description_ar' => 'توصيل مجاني للطلبات أعلى من هذا المبلغ',
                'category' => 'general',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
        } // end if !Schema::hasTable('store_settings')

        // Add rating type to reviews table for order/store ratings
        if (!Schema::hasColumn('reviews', 'rating_type')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->enum('rating_type', ['product', 'order', 'store'])->default('product')->after('id');
            });
        }

        // Add status column if it doesn't exist (for review moderation)
        if (!Schema::hasColumn('reviews', 'status')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->after('comment');
            });
        }

        // Add response columns for admin replies
        if (!Schema::hasColumn('reviews', 'response')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->text('response')->nullable()->after('is_approved'); // Admin response
                $table->timestamp('responded_at')->nullable()->after('response');
                $table->foreignId('responded_by')->nullable()->after('responded_at')->constrained('users')->nullOnDelete();
            });
        }

        // Add indexes if not exist
        Schema::table('reviews', function (Blueprint $table) {
            if (!Schema::hasIndex('reviews', 'reviews_rating_type_created_at_index')) {
                $table->index(['rating_type', 'created_at'], 'reviews_rating_type_created_at_index');
            }
            if (!Schema::hasIndex('reviews', 'reviews_order_id_rating_type_index')) {
                $table->index(['order_id', 'rating_type'], 'reviews_order_id_rating_type_index');
            }
        });

        // Create rating_logs table for audit trail
        Schema::create('rating_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained('reviews')->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action'); // created, updated, approved, rejected, responded
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();
            
            $table->index(['review_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rating_logs');
        
        Schema::table('reviews', function (Blueprint $table) {
            if (Schema::hasColumn('reviews', 'responded_by')) {
                $table->dropForeign(['responded_by']);
            }
        });
        
        Schema::table('reviews', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('reviews', 'response')) {
                $columns[] = 'response';
            }
            if (Schema::hasColumn('reviews', 'responded_at')) {
                $columns[] = 'responded_at';
            }
            if (Schema::hasColumn('reviews', 'responded_by')) {
                $columns[] = 'responded_by';
            }
            if (Schema::hasColumn('reviews', 'status')) {
                $columns[] = 'status';
            }
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });

        Schema::dropIfExists('store_settings');
    }
};
