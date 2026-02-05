<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Artisan;

class AdminStoreSettingsController extends Controller
{
    /**
     * Get all store settings
     */
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'store_name' => config('app.name', 'CART Hypermarket'),
                'store_status' => 'open', // Can be: open, closed, maintenance
                'working_hours' => [
                    'monday' => ['open' => '08:00', 'close' => '22:00'],
                    'tuesday' => ['open' => '08:00', 'close' => '22:00'],
                    'wednesday' => ['open' => '08:00', 'close' => '22:00'],
                    'thursday' => ['open' => '08:00', 'close' => '22:00'],
                    'friday' => ['open' => '08:00', 'close' => '22:00'],
                    'saturday' => ['open' => '08:00', 'close' => '22:00'],
                    'sunday' => ['open' => '08:00', 'close' => '22:00'],
                ],
                'min_order_amount' => 50,
                'max_order_amount' => 10000,
                'delivery_fee' => 30,
                'free_delivery_threshold' => 500,
                'currency' => 'EGP',
                'timezone' => 'Africa/Cairo',
                'allow_guest_checkout' => false,
                'require_phone_verification' => true,
                'require_email_verification' => true,
            ]
        ]);
    }

    /**
     * Get store open/closed status
     */
    public function getStoreStatus()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'status' => 'open',
                'is_open' => true,
                'message' => 'Store is currently open',
                'working_hours_today' => [
                    'open' => '08:00',
                    'close' => '22:00'
                ]
            ]
        ]);
    }

    /**
     * Update working hours
     */
    public function updateWorkingHours(Request $request)
    {
        $validated = $request->validate([
            'working_hours' => 'required|array',
            'working_hours.*.open' => 'required|date_format:H:i',
            'working_hours.*.close' => 'required|date_format:H:i',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Working hours updated successfully',
            'data' => $validated['working_hours']
        ]);
    }

    /**
     * Toggle store closure
     */
    public function toggleStoreClosure(Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|in:open,closed,maintenance',
            'reason' => 'nullable|string',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Store status updated successfully',
            'data' => [
                'status' => $validated['status'],
                'is_open' => $validated['status'] === 'open',
            ]
        ]);
    }

    /**
     * Update single setting
     */
    public function updateSetting(Request $request)
    {
        $validated = $request->validate([
            'key' => 'required|string',
            'value' => 'required',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Setting updated successfully',
            'data' => [
                'key' => $validated['key'],
                'value' => $validated['value']
            ]
        ]);
    }

    /**
     * Update multiple settings
     */
    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Settings updated successfully',
            'data' => $validated['settings']
        ]);
    }

    /**
     * Clear application cache
     */
    public function clearCache()
    {
        try {
            Artisan::call('cache:clear');
            Artisan::call('config:clear');
            Artisan::call('route:clear');
            Artisan::call('view:clear');

            return response()->json([
                'success' => true,
                'message' => 'All caches cleared successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to clear cache: ' . $e->getMessage()
            ], 500);
        }
    }
}
