<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add 'email_change' to the otps.type ENUM.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE `otps` MODIFY `type` ENUM('email_verification', 'phone_verification', 'password_reset', 'email_change') NOT NULL");
    }

    /**
     * Reverse: remove 'email_change' from the ENUM.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE `otps` MODIFY `type` ENUM('email_verification', 'phone_verification', 'password_reset') NOT NULL");
    }
};
