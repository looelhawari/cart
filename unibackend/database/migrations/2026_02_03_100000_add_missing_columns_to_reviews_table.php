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
        Schema::table('reviews', function (Blueprint $table) {
            // Add images column if not exists
            if (!Schema::hasColumn('reviews', 'images')) {
                $table->json('images')->nullable()->after('comment');
            }
            
            // Add status column if not exists
            if (!Schema::hasColumn('reviews', 'status')) {
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->after('images');
            }
            
            // Add rating_type column if not exists
            if (!Schema::hasColumn('reviews', 'rating_type')) {
                $table->enum('rating_type', ['product', 'order', 'store'])->default('product')->after('status');
            }
            
            // Add response column if not exists
            if (!Schema::hasColumn('reviews', 'response')) {
                $table->text('response')->nullable()->after('rating_type');
            }
            
            // Add responded_at column if not exists
            if (!Schema::hasColumn('reviews', 'responded_at')) {
                $table->timestamp('responded_at')->nullable()->after('response');
            }
            
            // Add responded_by column if not exists
            if (!Schema::hasColumn('reviews', 'responded_by')) {
                $table->unsignedBigInteger('responded_by')->nullable()->after('responded_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $columns = ['images', 'status', 'rating_type', 'response', 'responded_at', 'responded_by'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('reviews', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
