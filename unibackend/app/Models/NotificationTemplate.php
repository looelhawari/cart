<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationTemplate extends Model
{
    protected $fillable = [
        'code',
        'category',
        'priority',
        'title',
        'title_ar',
        'message',
        'message_ar',
        'icon',
        'action_type',
        'default_action_target',
        'push_enabled',
        'in_app_enabled',
        'email_enabled',
        'sms_enabled',
        'sound',
        'vibrate',
        'show_badge',
        'is_active',
        'variables',
    ];

    protected $casts = [
        'push_enabled' => 'boolean',
        'in_app_enabled' => 'boolean',
        'email_enabled' => 'boolean',
        'sms_enabled' => 'boolean',
        'vibrate' => 'boolean',
        'show_badge' => 'boolean',
        'is_active' => 'boolean',
        'variables' => 'array',
    ];

    /**
     * Get template by code.
     */
    public static function getByCode(string $code): ?self
    {
        return self::where('code', $code)->where('is_active', true)->first();
    }

    /**
     * Get all templates by category.
     */
    public static function getByCategory(string $category): \Illuminate\Database\Eloquent\Collection
    {
        return self::where('category', $category)->where('is_active', true)->get();
    }

    /**
     * Get all active templates.
     */
    public static function getAllActive(): \Illuminate\Database\Eloquent\Collection
    {
        return self::where('is_active', true)->orderBy('category')->orderBy('code')->get();
    }
}
