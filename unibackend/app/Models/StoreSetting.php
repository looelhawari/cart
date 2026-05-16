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
     * Customer-facing cache keys served by StoreSettingsController.
     *
     * SECURITY/CORRECTNESS HARDENED (Wave 5 — Task 3):
     * Previously this method only invalidated the MODEL-layer cache namespace
     * (`store_setting_*`, `store_settings_all`, `store_settings_public`). But
     * the mobile-facing endpoints (StoreSettingsController) cache under a
     * SECOND namespace using colons — `store:status`, `store:settings:public`,
     * `store:working-hours`, `store:delivery-settings` — with 2-15 min TTLs.
     * Result: an admin toggling "store closed" appeared to succeed but
     * customers kept seeing "open" for up to 15 min, and the mobile checkout
     * pre-gate (confirmation.tsx:193) read the stale value.
     *
     * Single source of truth: every writer must invalidate this list.
     * Listed here as a const so a future code reader doesn't have to chase
     * the namespace mismatch.
     */
    public const CUSTOMER_FACING_CACHE_KEYS = [
        'store:settings:public',
        'store:status',
        'store:working-hours',
        'store:delivery-settings',
    ];

    /**
     * Set a setting value.
     *
     * Invalidates both cache namespaces (model-layer + customer-layer) so
     * any writer — direct service call OR admin controller — propagates
     * the change to mobile clients immediately.
     */
    public static function setValue(string $key, mixed $value): bool
    {
        $setting = static::where('key', $key)->first();

        // Convert value to string for storage
        $stringValue = is_bool($value) ? ($value ? 'true' : 'false') : (string) $value;

        if (!$setting) {
            // BUGFIX: previously returned false when the row didn't exist,
            // which made every admin save silently no-op on a freshly-deployed
            // server where store_settings was never seeded. We now upsert —
            // the type is inferred from the value so the JSON-cast layer later
            // serializes it correctly.
            $type = match (true) {
                is_bool($value)                                     => 'boolean',
                is_numeric($value)                                  => 'number',
                is_array($value) || is_object($value)               => 'json',
                default                                             => 'string',
            };
            // category is a non-nullable column on the table; bucket by key
            // prefix so the admin's grouped-settings UI shows them sensibly.
            $category = match (true) {
                str_contains($key, 'delivery') || str_contains($key, 'order_amount')   => 'delivery',
                str_contains($key, 'time') || str_contains($key, 'hours') || str_contains($key, 'closure') => 'hours',
                str_contains($key, 'tax') || str_contains($key, 'currency')             => 'finance',
                default                                                                 => 'general',
            };
            static::create([
                'key'       => $key,
                'type'      => $type,
                'value'     => $stringValue,
                'category'  => $category,
                'is_public' => false,
            ]);
            self::flushCaches($key);
            return true;
        }

        $setting->update(['value' => $stringValue]);
        self::flushCaches($key);
        return true;
    }

    /**
     * Drop every cache layer that holds a copy of this setting. Called from
     * both the create and update branches of setValue() so callers don't
     * read a stale value after a successful write.
     */
    private static function flushCaches(string $key): void
    {
        // Model-layer cache (legacy keys with underscores).
        Cache::forget("store_setting_{$key}");
        Cache::forget('store_settings_all');
        Cache::forget('store_settings_public');

        // Customer-facing cache (keys with colons, served by StoreSettingsController).
        foreach (self::CUSTOMER_FACING_CACHE_KEYS as $cacheKey) {
            Cache::forget($cacheKey);
        }
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
