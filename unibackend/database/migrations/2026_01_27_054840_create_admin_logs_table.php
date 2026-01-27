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
        Schema::create('admin_logs', function (Blueprint $table) {
            $table->id();
            
            // User who performed the action
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name')->nullable(); // Store name for historical reference
            $table->string('user_email')->nullable(); // Store email for historical reference
            $table->string('user_role')->nullable(); // Store role at time of action
            
            // Action details
            $table->string('action'); // e.g., 'created_product', 'updated_order', 'deleted_user'
            $table->string('action_type'); // e.g., 'create', 'update', 'delete', 'read', 'export'
            $table->text('action_description')->nullable(); // Human-readable description
            
            // Entity/Resource being acted upon
            $table->string('entity_type')->nullable(); // e.g., 'product', 'order', 'user', 'category'
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('entity_name')->nullable(); // Store name for historical reference
            
            // Request details
            $table->string('http_method')->nullable(); // GET, POST, PUT, PATCH, DELETE
            $table->string('route_name')->nullable(); // Laravel route name
            $table->text('url')->nullable(); // Full request URL
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            
            // Request/Response data
            $table->json('request_data')->nullable(); // Sanitized request payload
            $table->json('old_values')->nullable(); // Previous values (for updates)
            $table->json('new_values')->nullable(); // New values (for creates/updates)
            $table->json('changes')->nullable(); // What changed (diff)
            
            // Response details
            $table->integer('response_status')->nullable(); // HTTP status code
            $table->boolean('is_successful')->default(true);
            $table->text('error_message')->nullable();
            
            // Additional context
            $table->string('module')->nullable(); // e.g., 'products', 'orders', 'users', 'analytics'
            $table->string('session_id')->nullable();
            $table->json('metadata')->nullable(); // Any additional data
            
            $table->timestamps();
            
            // Indexes for efficient querying
            $table->index('user_id');
            $table->index('action');
            $table->index('action_type');
            $table->index('entity_type');
            $table->index('entity_id');
            $table->index('module');
            $table->index('created_at');
            $table->index('is_successful');
            $table->index(['entity_type', 'entity_id']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin_logs');
    }
};
