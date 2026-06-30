<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('complaint_attachments', 'message_id')) {
            Schema::table('complaint_attachments', function (Blueprint $table) {
                $table->foreignId('message_id')
                    ->nullable()
                    ->after('complaint_id')
                    ->constrained('complaint_messages')
                    ->nullOnDelete();

                $table->index('message_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('complaint_attachments', 'message_id')) {
            Schema::table('complaint_attachments', function (Blueprint $table) {
                $table->dropForeign(['message_id']);
                $table->dropIndex(['message_id']);
                $table->dropColumn('message_id');
            });
        }
    }
};
