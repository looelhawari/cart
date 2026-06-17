<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Global content-version registry for admin→customer realtime sync.
 * One row per content type ('global' is the master counter); every admin
 * change increments the type row + the 'global' row. DB-backed so the
 * version survives `cache:clear` / deploys (a Redis-only counter would
 * reset and desync clients).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_versions', function (Blueprint $table) {
            $table->id();
            $table->string('type', 40)->unique(); // global, product, category, settings, map, banner, ...
            $table->unsignedBigInteger('version')->default(1);
            $table->timestamps();
        });

        // Seed the baseline rows.
        $now = now();
        $rows = array_map(fn ($t) => [
            'type' => $t, 'version' => 1, 'created_at' => $now, 'updated_at' => $now,
        ], ['global', 'product', 'category', 'settings', 'map', 'banner', 'promotion']);
        \Illuminate\Support\Facades\DB::table('content_versions')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('content_versions');
    }
};
