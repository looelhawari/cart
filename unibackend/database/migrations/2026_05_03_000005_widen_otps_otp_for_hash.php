<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SECURITY HARDENING (audit Chain C item 3):
     *   OTP codes are now stored as bcrypt hashes (60-char strings) instead
     *   of 6-digit plaintext. The legacy `otp varchar(6)` column is too
     *   narrow to hold a hash, so we widen it.
     *
     *   Existing plaintext OTPs are wiped on migration up — they would not
     *   verify under the new Hash::check path anyway, and they're short-lived
     *   (10-minute expiry).
     */
    public function up(): void
    {
        // Wipe legacy plaintext rows — they won't verify under the new flow.
        DB::table('otps')->delete();

        DB::statement('ALTER TABLE otps MODIFY COLUMN otp VARCHAR(255) NOT NULL');
    }

    public function down(): void
    {
        // Refuse to narrow if any hash-shaped values exist.
        $maxLen = (int) DB::table('otps')->selectRaw('MAX(CHAR_LENGTH(otp)) AS m')->value('m');
        if ($maxLen > 6) {
            throw new \RuntimeException(
                'Cannot revert otps.otp width — existing rows contain values longer than 6 chars.'
            );
        }
        DB::statement('ALTER TABLE otps MODIFY COLUMN otp VARCHAR(6) NOT NULL');
    }
};
