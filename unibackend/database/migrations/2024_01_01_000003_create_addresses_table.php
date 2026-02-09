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
        if (!Schema::hasTable('addresses')) {
            Schema::create('addresses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('label', 100)->comment('Home, Work, Other');
                $table->text('street');
                $table->string('building')->nullable();
                $table->string('floor')->nullable();
                $table->string('apartment')->nullable();
                $table->string('city', 100);
                $table->string('area')->nullable();
                $table->string('landmark')->nullable();
                $table->boolean('is_default')->default(false);
                $table->timestamps();

                $table->index('user_id');
                $table->index('is_default');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};
