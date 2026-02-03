<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StoreSettingsController extends Controller
{
    /**
     * Get all store settings grouped by category
     */
    public function index()
    {
        $settings = StoreSetting::getAllGrouped();
        
        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Get store status (open/closed with reason)
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
     * Update working hours settings
     */
    public function updateWorkingHours(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'store_open_time' => 'required|date_format:H:i',
            'store_close_time' => 'required|date_format:H:i',
            'accept_orders_outside_hours' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        StoreSetting::setValue('store_open_time', $request->store_open_time);
        StoreSetting::setValue('store_close_time', $request->store_close_time);
        
        if ($request->has('accept_orders_outside_hours')) {
            StoreSetting::setValue('accept_orders_outside_hours', $request->accept_orders_outside_hours);
        }

        return response()->json([
            'success' => true,
            'message' => 'Working hours updated successfully',
            'data' => [
                'store_open_time' => $request->store_open_time,
                'store_close_time' => $request->store_close_time,
                'accept_orders_outside_hours' => $request->accept_orders_outside_hours ?? false,
            ],
        ]);
    }

    /**
     * Toggle store temporary closure
     */
    public function toggleStoreClosure(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'is_closed' => 'required|boolean',
            'reason_en' => 'nullable|string|max:255',
            'reason_ar' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        StoreSetting::setValue('is_store_temporarily_closed', $request->is_closed);
        
        if ($request->is_closed) {
            StoreSetting::setValue('temporary_closure_reason_en', $request->reason_en ?? 'Store is temporarily closed');
            StoreSetting::setValue('temporary_closure_reason_ar', $request->reason_ar ?? 'المتجر مغلق مؤقتاً');
        } else {
            StoreSetting::setValue('temporary_closure_reason_en', '');
            StoreSetting::setValue('temporary_closure_reason_ar', '');
        }

        return response()->json([
            'success' => true,
            'message' => $request->is_closed ? 'Store closed temporarily' : 'Store reopened',
            'data' => StoreSetting::isStoreOpen(),
        ]);
    }

    /**
     * Update a single setting
     */
    public function updateSetting(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'key' => 'required|string|exists:store_settings,key',
            'value' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $success = StoreSetting::setValue($request->key, $request->value);

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Setting not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Setting updated successfully',
            'data' => [
                'key' => $request->key,
                'value' => StoreSetting::getValue($request->key),
            ],
        ]);
    }

    /**
     * Update multiple settings at once
     */
    public function updateSettings(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'settings' => 'required|array',
            'settings.*.key' => 'required|string|exists:store_settings,key',
            'settings.*.value' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $updated = [];
        foreach ($request->settings as $setting) {
            if (StoreSetting::setValue($setting['key'], $setting['value'])) {
                $updated[] = $setting['key'];
            }
        }

        return response()->json([
            'success' => true,
            'message' => count($updated) . ' settings updated successfully',
            'data' => [
                'updated' => $updated,
            ],
        ]);
    }

    /**
     * Clear settings cache
     */
    public function clearCache()
    {
        StoreSetting::clearCache();

        return response()->json([
            'success' => true,
            'message' => 'Settings cache cleared',
        ]);
    }
}
