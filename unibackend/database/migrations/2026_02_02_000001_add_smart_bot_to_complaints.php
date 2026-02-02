<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add bot-related fields to complaints table
        Schema::table('complaints', function (Blueprint $table) {
            $table->boolean('bot_handled')->default(true)->after('status');
            $table->boolean('escalated_to_agent')->default(false)->after('bot_handled');
            $table->timestamp('escalated_at')->nullable()->after('escalated_to_agent');
            $table->string('escalation_reason')->nullable()->after('escalated_at');
            $table->integer('bot_satisfaction_rating')->nullable()->after('escalation_reason');
            $table->text('bot_feedback')->nullable()->after('bot_satisfaction_rating');
        });

        // Add is_bot_reply flag to complaint_messages
        Schema::table('complaint_messages', function (Blueprint $table) {
            $table->boolean('is_bot_reply')->default(false)->after('is_admin_reply');
            $table->string('bot_intent')->nullable()->after('is_bot_reply');
        });

        // Create bot_responses table for smart replies
        Schema::create('bot_responses', function (Blueprint $table) {
            $table->id();
            $table->string('intent')->index(); // e.g., greeting, order_status, track_order, etc.
            $table->string('category')->nullable()->index(); // matches complaint category
            $table->json('keywords'); // keywords that trigger this response
            $table->text('response_en'); // English response
            $table->text('response_ar'); // Arabic response
            $table->string('action_type')->nullable(); // e.g., show_orders, track_order, escalate, etc.
            $table->json('action_data')->nullable(); // additional action data
            $table->integer('priority')->default(0); // higher priority = matched first
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Create bot_conversation_context for maintaining context
        Schema::create('bot_conversation_contexts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complaint_id')->constrained()->onDelete('cascade');
            $table->string('current_intent')->nullable();
            $table->json('context_data')->nullable(); // stores conversation state
            $table->integer('message_count')->default(0);
            $table->boolean('awaiting_input')->default(false);
            $table->string('awaiting_input_type')->nullable(); // e.g., order_id, confirmation
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn([
                'bot_handled',
                'escalated_to_agent',
                'escalated_at',
                'escalation_reason',
                'bot_satisfaction_rating',
                'bot_feedback',
            ]);
        });

        Schema::table('complaint_messages', function (Blueprint $table) {
            $table->dropColumn(['is_bot_reply', 'bot_intent']);
        });

        Schema::dropIfExists('bot_conversation_contexts');
        Schema::dropIfExists('bot_responses');
    }
};
