<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class StoreSettingsController extends Controller
{
    /**
     * Get public store settings for mobile app
     * Cached for 15 minutes — rarely changes
     */
    public function index()
    {
        $settings = Cache::remember('store:settings:public', 900, function () {
            return StoreSetting::getPublicSettings();
        });

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Get store status (open/closed with reason)
     * Cached for 2 minutes — short TTL since store can open/close
     */
    public function getStoreStatus()
    {
        $status = Cache::remember('store:status', 120, function () {
            return StoreSetting::isStoreOpen();
        });

        return response()->json([
            'success' => true,
            'data' => $status,
        ]);
    }

    /**
     * Get working hours — cached for 15 minutes
     */
    public function getWorkingHours()
    {
        $hours = Cache::remember('store:working-hours', 900, function () {
            return [
                'open_time' => StoreSetting::getValue('store_open_time', '11:00'),
                'close_time' => StoreSetting::getValue('store_close_time', '00:00'),
                'accept_orders_outside_hours' => StoreSetting::getValue('accept_orders_outside_hours', false),
                'is_temporarily_closed' => StoreSetting::getValue('is_store_temporarily_closed', false),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $hours,
        ]);
    }

    /**
     * Get delivery settings — cached for 15 minutes
     */
    public function getDeliverySettings()
    {
        $delivery = Cache::remember('store:delivery-settings', 900, function () {
            return [
                'minimum_order_amount' => StoreSetting::getValue('minimum_order_amount', 50),
                'delivery_fee' => StoreSetting::getValue('delivery_fee', 20),
                'free_delivery_threshold' => StoreSetting::getValue('free_delivery_threshold', 200),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $delivery,
        ]);
    }

    /**
     * Clear all store settings cache (call from admin updates)
     */
    public static function clearCache(): void
    {
        Cache::forget('store:settings:public');
        Cache::forget('store:status');
        Cache::forget('store:working-hours');
        Cache::forget('store:delivery-settings');
    }
}
