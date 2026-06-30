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
        $hasDateOfBirth = Schema::hasColumn('users', 'date_of_birth');
        $hasGender = Schema::hasColumn('users', 'gender');

        if ($hasDateOfBirth && $hasGender) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($hasDateOfBirth, $hasGender) {
            if (! $hasDateOfBirth) {
                $table->date('date_of_birth')->nullable()->after('phone');
            }

            if (! $hasGender) {
                $table->enum('gender', ['male', 'female', 'other'])
                    ->nullable()
                    ->after('date_of_birth');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'gender')) {
                $table->dropColumn('gender');
            }

            if (Schema::hasColumn('users', 'date_of_birth')) {
                $table->dropColumn('date_of_birth');
            }
        });
    }
};
