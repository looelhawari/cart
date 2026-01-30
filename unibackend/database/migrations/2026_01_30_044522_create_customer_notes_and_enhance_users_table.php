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
        Schema::create('customer_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // The customer
            $table->foreignId('author_id')->nullable()->constrained('users')->onDelete('set null'); // The staff member
            $table->text('note');
            $table->boolean('is_visible_to_customer')->default(false);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_cod_restricted')->default(false)->after('is_active');
            $table->decimal('max_order_value', 10, 2)->nullable()->after('is_cod_restricted');
            $table->string('registration_source')->default('unknown')->after('role'); // web, android, ios
            $table->integer('loyalty_points')->default(0)->after('max_order_value');
            $table->boolean('is_vip')->default(false)->after('loyalty_points');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_cod_restricted', 'max_order_value', 'registration_source', 'loyalty_points', 'is_vip']);
        });

        Schema::dropIfExists('customer_notes');
    }
};
