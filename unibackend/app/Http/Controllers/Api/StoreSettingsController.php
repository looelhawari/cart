<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\Request;

class StoreSettingsController extends Controller
{
    /**
     * Get public store settings for mobile app
     */
    public function index()
    {
        $settings = StoreSetting::getPublicSettings();
        
        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Get store status (open/closed with reason)
     * Used by mobile app to determine if orders can be placed
     */
    public function getStoreStatus()
    {
        $status = StoreSetting::isStoreOpen();
        
        return response()->json([
            'success' => true,
            'data' => $status,
        ]);
    }

    /**
     * Get working hours
     */
    public function getWorkingHours()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'open_time' => StoreSetting::getValue('store_open_time', '11:00'),
                'close_time' => StoreSetting::getValue('store_close_time', '00:00'),
                'accept_orders_outside_hours' => StoreSetting::getValue('accept_orders_outside_hours', false),
                'is_temporarily_closed' => StoreSetting::getValue('is_store_temporarily_closed', false),
            ],
        ]);
    }

    /**
     * Get delivery settings for checkout
     */
    public function getDeliverySettings()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'minimum_order_amount' => StoreSetting::getValue('minimum_order_amount', 50),
                'delivery_fee' => StoreSetting::getValue('delivery_fee', 20),
                'free_delivery_threshold' => StoreSetting::getValue('free_delivery_threshold', 200),
            ],
        ]);
    }
}
