<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaticPage extends Model
{
    protected $fillable = [
        'slug',
        'title_en',
        'title_ar',
        'content_en',
        'content_ar',
        'is_active',
        'last_updated_at',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_updated_at' => 'datetime',
    ];

    /**
     * Page types/slugs
     */
    public const SLUG_TERMS = 'terms';
    public const SLUG_PRIVACY = 'privacy';
    public const SLUG_ABOUT = 'about';

    public const VALID_SLUGS = [
        self::SLUG_TERMS,
        self::SLUG_PRIVACY,
        self::SLUG_ABOUT,
    ];

    /**
     * Get the admin who last updated this page.
     */
    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get title based on locale.
     */
    public function getTitle(string $locale = 'en'): string
    {
        return $locale === 'ar' ? $this->title_ar : $this->title_en;
    }

    /**
     * Get content based on locale.
     */
    public function getContent(string $locale = 'en'): string
    {
        return $locale === 'ar' ? $this->content_ar : $this->content_en;
    }

    /**
     * Scope to get active pages only.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get page by slug.
     */
    public static function findBySlug(string $slug): ?self
    {
        return static::where('slug', $slug)->first();
    }
}
