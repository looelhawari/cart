<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class StoreSetting extends Model
{
    protected $table = 'store_settings';

    protected $fillable = [
        'key',
        'type',
        'value',
        'description_en',
        'description_ar',
        'category',
        'is_public',
    ];

    protected $casts = [
        'is_public' => 'boolean',
    ];

    /**
     * Get a setting value by key with optional default
     */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        $cacheKey = "store_setting_{$key}";
        
        return Cache::remember($cacheKey, 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            
            if (!$setting) {
                return $default;
            }

            return static::castValue($setting->value, $setting->type);
        });
    }

    /**
     * Set a setting value
     */
    public static function setValue(string $key, mixed $value): bool
    {
        $setting = static::where('key', $key)->first();
        
        if (!$setting) {
            return false;
        }

        // Convert value to string for storage
        $stringValue = is_bool($value) ? ($value ? 'true' : 'false') : (string) $value;
        
        $setting->update(['value' => $stringValue]);
        
        // Clear cache
        Cache::forget("store_setting_{$key}");
        Cache::forget('store_settings_all');
        Cache::forget('store_settings_public');
        
        return true;
    }

    /**
     * Get all settings grouped by category
     */
    public static function getAllGrouped(): array
    {
        return Cache::remember('store_settings_all', 3600, function () {
            $settings = static::all();
            $grouped = [];
            
            foreach ($settings as $setting) {
                $grouped[$setting->category][$setting->key] = [
                    'id' => $setting->id,
                    'key' => $setting->key,
                    'value' => static::castValue($setting->value, $setting->type),
                    'type' => $setting->type,
                    'description_en' => $setting->description_en,
                    'description_ar' => $setting->description_ar,
                    'is_public' => $setting->is_public,
                ];
            }
            
            return $grouped;
        });
    }

    /**
     * Get all public settings (for mobile app)
     */
    public static function getPublicSettings(): array
    {
        return Cache::remember('store_settings_public', 3600, function () {
            $settings = static::where('is_public', true)->get();
            $result = [];
            
            foreach ($settings as $setting) {
                $result[$setting->key] = static::castValue($setting->value, $setting->type);
            }
            
            return $result;
        });
    }

    /**
     * Check if store is currently open
     */
    public static function isStoreOpen(): array
    {
        $isTempClosed = static::getValue('is_store_temporarily_closed', false);
        
        if ($isTempClosed) {
            return [
                'is_open' => false,
                'reason' => 'temporarily_closed',
                'message_en' => static::getValue('temporary_closure_reason_en', 'Store is temporarily closed'),
                'message_ar' => static::getValue('temporary_closure_reason_ar', 'المتجر مغلق مؤقتاً'),
            ];
        }

        $acceptOutsideHours = static::getValue('accept_orders_outside_hours', false);
        
        if ($acceptOutsideHours) {
            return [
                'is_open' => true,
                'reason' => 'always_open',
                'message_en' => 'Store accepts orders 24/7',
                'message_ar' => 'المتجر يقبل الطلبات على مدار الساعة',
            ];
        }

        $openTime = static::getValue('store_open_time', '11:00');
        $closeTime = static::getValue('store_close_time', '00:00');
        
        $now = now();
        $currentTime = $now->format('H:i');
        
        // Handle midnight closing (00:00 means midnight next day)
        $isOpen = false;
        if ($closeTime === '00:00') {
            // Open from open time until midnight
            $isOpen = $currentTime >= $openTime;
        } elseif ($closeTime < $openTime) {
            // Overnight hours (e.g., 22:00 - 06:00)
            $isOpen = $currentTime >= $openTime || $currentTime < $closeTime;
        } else {
            // Normal hours
            $isOpen = $currentTime >= $openTime && $currentTime < $closeTime;
        }

        if ($isOpen) {
            return [
                'is_open' => true,
                'reason' => 'within_hours',
                'open_time' => $openTime,
                'close_time' => $closeTime,
                'message_en' => "Open until {$closeTime}",
                'message_ar' => "مفتوح حتى {$closeTime}",
            ];
        }

        return [
            'is_open' => false,
            'reason' => 'outside_hours',
            'open_time' => $openTime,
            'close_time' => $closeTime,
            'message_en' => "Opens at {$openTime}",
            'message_ar' => "يفتح الساعة {$openTime}",
        ];
    }

    /**
     * Clear all settings cache
     */
    public static function clearCache(): void
    {
        Cache::forget('store_settings_all');
        Cache::forget('store_settings_public');
        
        $settings = static::all();
        foreach ($settings as $setting) {
            Cache::forget("store_setting_{$setting->key}");
        }
    }

    /**
     * Cast value based on type
     */
    protected static function castValue(string $value, string $type): mixed
    {
        return match ($type) {
            'boolean' => $value === 'true' || $value === '1',
            'number' => is_numeric($value) ? (float) $value : 0,
            'json' => json_decode($value, true) ?? [],
            default => $value,
        };
    }
}
