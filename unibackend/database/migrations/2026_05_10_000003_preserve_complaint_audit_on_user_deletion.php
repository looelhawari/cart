<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SECURITY / DATA-INTEGRITY HARDENING (Slice 2):
     *
     * Both complaints.user_id and complaint_messages.user_id were declared
     * onDelete('cascade'). When an admin deleted a customer (or the customer
     * deleted their own account for GDPR), the entire ticket history vanished
     * along with all admin replies, attachments and resolution notes.
     *
     * That destroys the audit trail required to prove how a complaint was
     * handled — exactly the data Legal needs in disputes.
     *
     * Fix:
     *   1. Snapshot user identity onto each row (email, name, role at time of
     *      authorship) so the trail remains readable after user deletion.
     *   2. Backfill snapshots from current user data for existing rows.
     *   3. Make user_id nullable.
     *   4. Replace cascade FK with onDelete('set null') so deleting a user
     *      anonymises the row instead of dropping it.
     */
    public function up(): void
    {
        // 1. Add identity-snapshot columns
        Schema::table('complaints', function (Blueprint $t) {
            if (! Schema::hasColumn('complaints', 'user_email_snapshot')) {
                $t->string('user_email_snapshot', 191)->nullable()->after('user_id');
            }
            if (! Schema::hasColumn('complaints', 'user_name_snapshot')) {
                $t->string('user_name_snapshot', 191)->nullable()->after('user_email_snapshot');
            }
        });
        Schema::table('complaint_messages', function (Blueprint $t) {
            if (! Schema::hasColumn('complaint_messages', 'author_email_snapshot')) {
                $t->string('author_email_snapshot', 191)->nullable()->after('user_id');
            }
            if (! Schema::hasColumn('complaint_messages', 'author_name_snapshot')) {
                $t->string('author_name_snapshot', 191)->nullable()->after('author_email_snapshot');
            }
            if (! Schema::hasColumn('complaint_messages', 'author_role_snapshot')) {
                $t->string('author_role_snapshot', 32)->nullable()->after('author_name_snapshot');
            }
        });

        // 2. Backfill snapshots from current users (best-effort; null users stay null)
        DB::statement(<<<SQL
            UPDATE complaints c
              JOIN users u ON u.id = c.user_id
               SET c.user_email_snapshot = u.email,
                   c.user_name_snapshot  = TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')))
             WHERE c.user_email_snapshot IS NULL
        SQL);
        DB::statement(<<<SQL
            UPDATE complaint_messages m
              JOIN users u ON u.id = m.user_id
               SET m.author_email_snapshot = u.email,
                   m.author_name_snapshot  = TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))),
                   m.author_role_snapshot  = u.role
             WHERE m.author_email_snapshot IS NULL
        SQL);

        // 3. Drop the cascade FKs and re-add as set-null. user_id must be
        //    nullable for set-null to work.
        //
        // The FK name varies: rows seeded from the legacy SQL dump have
        // MySQL-generated names like `complaints_ibfk_1`, while rows created
        // by Laravel have `complaints_user_id_foreign`. Look up the actual
        // constraint name from information_schema instead of guessing.
        $this->dropFkOnUserId('complaints');
        DB::statement('ALTER TABLE complaints MODIFY user_id BIGINT UNSIGNED NULL');
        Schema::table('complaints', function (Blueprint $t) {
            $t->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });

        $this->dropFkOnUserId('complaint_messages');
        DB::statement('ALTER TABLE complaint_messages MODIFY user_id BIGINT UNSIGNED NULL');
        Schema::table('complaint_messages', function (Blueprint $t) {
            $t->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    private function dropFkOnUserId(string $table): void
    {
        $row = DB::selectOne(
            "SELECT CONSTRAINT_NAME AS name
               FROM information_schema.KEY_COLUMN_USAGE
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = ?
                AND COLUMN_NAME = 'user_id'
                AND REFERENCED_TABLE_NAME = 'users'
              LIMIT 1",
            [$table]
        );
        if ($row && ! empty($row->name)) {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$row->name}`");
        }
    }

    public function down(): void
    {
        // Restore original cascade FK + drop snapshot columns. Note: rows
        // whose user has since been deleted will fail the cascade restore
        // (FK references a missing user). Down is best-effort.
        Schema::table('complaints', function (Blueprint $t) {
            $t->dropForeign(['user_id']);
        });
        DB::statement('UPDATE complaints SET user_id = 0 WHERE user_id IS NULL');
        DB::statement('ALTER TABLE complaints MODIFY user_id BIGINT UNSIGNED NOT NULL');
        Schema::table('complaints', function (Blueprint $t) {
            $t->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            if (Schema::hasColumn('complaints', 'user_name_snapshot')) {
                $t->dropColumn('user_name_snapshot');
            }
            if (Schema::hasColumn('complaints', 'user_email_snapshot')) {
                $t->dropColumn('user_email_snapshot');
            }
        });

        Schema::table('complaint_messages', function (Blueprint $t) {
            $t->dropForeign(['user_id']);
        });
        DB::statement('UPDATE complaint_messages SET user_id = 0 WHERE user_id IS NULL');
        DB::statement('ALTER TABLE complaint_messages MODIFY user_id BIGINT UNSIGNED NOT NULL');
        Schema::table('complaint_messages', function (Blueprint $t) {
            $t->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            foreach (['author_role_snapshot', 'author_name_snapshot', 'author_email_snapshot'] as $col) {
                if (Schema::hasColumn('complaint_messages', $col)) {
                    $t->dropColumn($col);
                }
            }
        });
    }
};
