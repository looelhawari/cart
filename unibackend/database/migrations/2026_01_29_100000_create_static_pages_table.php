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
        Schema::create('static_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique(); // terms, privacy, about
            $table->string('title_en');
            $table->string('title_ar');
            $table->longText('content_en');
            $table->longText('content_ar');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_updated_at')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Create default pages
        DB::table('static_pages')->insert([
            [
                'slug' => 'terms',
                'title_en' => 'Terms and Conditions',
                'title_ar' => 'الشروط والأحكام',
                'content_en' => '<h1>Terms and Conditions</h1><p>Welcome to CART. Please read these terms carefully.</p>',
                'content_ar' => '<h1>الشروط والأحكام</h1><p>مرحباً بكم في CART. يرجى قراءة هذه الشروط بعناية.</p>',
                'is_active' => true,
                'last_updated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'privacy',
                'title_en' => 'Privacy Policy',
                'title_ar' => 'سياسة الخصوصية',
                'content_en' => '<h1>Privacy Policy</h1><p>Your privacy is important to us.</p>',
                'content_ar' => '<h1>سياسة الخصوصية</h1><p>خصوصيتك مهمة بالنسبة لنا.</p>',
                'is_active' => true,
                'last_updated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'about',
                'title_en' => 'About Us',
                'title_ar' => 'من نحن',
                'content_en' => '<h1>About CART</h1><p>We are your trusted grocery partner.</p>',
                'content_ar' => '<h1>عن CART</h1><p>نحن شريكك الموثوق في البقالة.</p>',
                'is_active' => true,
                'last_updated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('static_pages');
    }
};
