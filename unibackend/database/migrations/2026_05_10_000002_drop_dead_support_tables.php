<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SECURITY / DATA-INTEGRITY HARDENING (Slice 2):
     *
     * The codebase shipped two parallel support-ticket schemas:
     *
     *   • complaints + complaint_messages + complaint_attachments  (ACTIVE — used by
     *     ComplaintController, Admin\SupportController, and the Smart Bot path)
     *   • support_tickets + ticket_messages                        (DEAD — only the
     *     migrations and orphan SupportTicket / TicketMessage models exist; no
     *     controller writes here)
     *
     * Carrying both schemas is dangerous in two ways:
     *   1. Confusion: future devs may write tickets to support_tickets, splitting
     *      the audit log across two stores.
     *   2. Snapshots: every backup carries dead schema, increasing restore time
     *      and creating GDPR ambiguity about where customer support data lives.
     *
     * This migration drops the dead pair. The orphan SupportTicket / TicketMessage
     * Eloquent models are removed in the same change.
     */
    public function up(): void
    {
        Schema::dropIfExists('ticket_messages');
        Schema::dropIfExists('support_tickets');
    }

    public function down(): void
    {
        Schema::create('support_tickets', function ($table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('subject');
            $table->text('description');
            $table->string('status')->default('open');
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('ticket_messages', function ($table) {
            $table->id();
            $table->unsignedBigInteger('ticket_id');
            $table->unsignedBigInteger('user_id');
            $table->text('message');
            $table->timestamps();
            $table->foreign('ticket_id')->references('id')->on('support_tickets')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
