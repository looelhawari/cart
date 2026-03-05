<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class AdminStoreSettingsController extends Controller
{
    /**
     * Get all store settings grouped by category
     */
    public function index()
    {
        $settings = StoreSetting::getAllGrouped();

        // Also get flat list for easier frontend handling
        $flatSettings = StoreSetting::all()->map(function ($setting) {
            return [
                'id' => $setting->id,
                'key' => $setting->key,
                'value' => $this->castValue($setting->value, $setting->type),
                'type' => $setting->type,
                'description_en' => $setting->description_en,
                'description_ar' => $setting->description_ar,
                'category' => $setting->category,
                'is_public' => $setting->is_public,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'grouped' => $settings,
                'settings' => $flatSettings,
                'store_name' => config('app.name', 'CART'),
                'currency' => 'EGP',
                'timezone' => 'Africa/Cairo',
            ]
        ]);
    }

    /**
     * Get store open/closed status
     */
    public function getStoreStatus()
    {
        $status = StoreSetting::isStoreOpen();

        return response()->json([
            'success' => true,
            'data' => [
                'status' => $status['is_open'] ? 'open' : 'closed',
                'is_open' => $status['is_open'],
                'reason' => $status['reason'] ?? null,
                'message' => $status['message_en'] ?? 'Store status unknown',
                'message_ar' => $status['message_ar'] ?? 'حالة المتجر غير معروفة',
                'working_hours_today' => [
                    'open' => StoreSetting::getValue('store_open_time', '11:00'),
                    'close' => StoreSetting::getValue('store_close_time', '00:00')
                ],
                'is_temporarily_closed' => StoreSetting::getValue('is_store_temporarily_closed', false),
                'temporary_closure_reason' => StoreSetting::getValue('temporary_closure_reason_en', ''),
            ]
        ]);
    }

    /**
     * Update working hours
     */
    public function updateWorkingHours(Request $request)
    {
        $validated = $request->validate([
            'open_time' => 'required|date_format:H:i',
            'close_time' => 'required|date_format:H:i',
            'accept_orders_outside_hours' => 'boolean',
        ]);

        $openResult = StoreSetting::setValue('store_open_time', $validated['open_time']);
        $closeResult = StoreSetting::setValue('store_close_time', $validated['close_time']);

        if ($openResult === false || $closeResult === false) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update working hours. Settings not found in database.',
            ], 500);
        }

        if (isset($validated['accept_orders_outside_hours'])) {
            StoreSetting::setValue('accept_orders_outside_hours', $validated['accept_orders_outside_hours']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Working hours updated successfully',
            'data' => [
                'open_time' => StoreSetting::getValue('store_open_time'),
                'close_time' => StoreSetting::getValue('store_close_time'),
                'accept_orders_outside_hours' => StoreSetting::getValue('accept_orders_outside_hours', false),
            ]
        ]);
    }

    /**
     * Toggle store closure
     */
    public function toggleStoreClosure(Request $request)
    {
        $validated = $request->validate([
            'is_closed' => 'required|boolean',
            'reason_en' => 'nullable|string|max:500',
            'reason_ar' => 'nullable|string|max:500',
        ]);

        StoreSetting::setValue('is_store_temporarily_closed', $validated['is_closed']);

        if (isset($validated['reason_en'])) {
            StoreSetting::setValue('temporary_closure_reason_en', $validated['reason_en']);
        }
        if (isset($validated['reason_ar'])) {
            StoreSetting::setValue('temporary_closure_reason_ar', $validated['reason_ar']);
        }

        $status = $validated['is_closed'] ? 'closed' : 'open';

        return response()->json([
            'success' => true,
            'message' => "Store is now {$status}",
            'data' => [
                'status' => $status,
                'is_open' => !$validated['is_closed'],
                'is_temporarily_closed' => $validated['is_closed'],
                'reason_en' => $validated['reason_en'] ?? '',
                'reason_ar' => $validated['reason_ar'] ?? '',
            ]
        ]);
    }

    /**
     * Update single setting
     */
    public function updateSetting(Request $request)
    {
        $validated = $request->validate([
            'key' => 'required|string|exists:store_settings,key',
            'value' => 'required',
        ]);

        $setting = StoreSetting::where('key', $validated['key'])->first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => 'Setting not found'
            ], 404);
        }

        // Convert value based on type
        $value = $validated['value'];
        if ($setting->type === 'boolean') {
            $value = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
        } elseif ($setting->type === 'json') {
            $value = is_array($value) ? json_encode($value) : $value;
        }

        $setting->update(['value' => (string) $value]);
        StoreSetting::clearCache();

        return response()->json([
            'success' => true,
            'message' => 'Setting updated successfully',
            'data' => [
                'key' => $setting->key,
                'value' => $this->castValue($setting->value, $setting->type),
                'type' => $setting->type,
            ]
        ]);
    }

    /**
     * Update multiple settings at once
     */
    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string|exists:store_settings,key',
            'settings.*.value' => 'required',
        ]);

        $updated = [];

        DB::beginTransaction();
        try {
            foreach ($validated['settings'] as $item) {
                $setting = StoreSetting::where('key', $item['key'])->first();
                if ($setting) {
                    $value = $item['value'];
                    if ($setting->type === 'boolean') {
                        $value = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                    } elseif ($setting->type === 'json') {
                        $value = is_array($value) ? json_encode($value) : $value;
                    }

                    $setting->update(['value' => (string) $value]);
                    $updated[] = $item['key'];
                }
            }

            DB::commit();
            StoreSetting::clearCache();
            \App\Http\Controllers\Api\StoreSettingsController::clearCache();

            return response()->json([
                'success' => true,
                'message' => count($updated) . ' settings updated successfully',
                'data' => ['updated_keys' => $updated]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new setting (admin only)
     */
    public function createSetting(Request $request)
    {
        $validated = $request->validate([
            'key' => 'required|string|unique:store_settings,key|max:100',
            'value' => 'required',
            'type' => 'required|in:string,boolean,number,json,time',
            'description_en' => 'nullable|string|max:500',
            'description_ar' => 'nullable|string|max:500',
            'category' => 'required|string|max:50',
            'is_public' => 'boolean',
        ]);

        $value = $validated['value'];
        if ($validated['type'] === 'boolean') {
            $value = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
        } elseif ($validated['type'] === 'json') {
            $value = is_array($value) ? json_encode($value) : $value;
        }

        $setting = StoreSetting::create([
            'key' => $validated['key'],
            'type' => $validated['type'],
            'value' => (string) $value,
            'description_en' => $validated['description_en'] ?? null,
            'description_ar' => $validated['description_ar'] ?? null,
            'category' => $validated['category'],
            'is_public' => $validated['is_public'] ?? false,
        ]);

        StoreSetting::clearCache();

        return response()->json([
            'success' => true,
            'message' => 'Setting created successfully',
            'data' => $setting
        ], 201);
    }

    /**
     * Delete a setting (admin only)
     */
    public function deleteSetting($key)
    {
        $setting = StoreSetting::where('key', $key)->first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => 'Setting not found'
            ], 404);
        }

        $setting->delete();
        StoreSetting::clearCache();

        return response()->json([
            'success' => true,
            'message' => 'Setting deleted successfully'
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
            StoreSetting::clearCache();

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

    /**
     * Get delivery settings
     */
    public function getDeliverySettings()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'minimum_order_amount' => StoreSetting::getValue('minimum_order_amount', 50),
                'delivery_fee' => StoreSetting::getValue('delivery_fee', 20),
                'free_delivery_threshold' => StoreSetting::getValue('free_delivery_threshold', 200),
            ]
        ]);
    }

    /**
     * Update delivery settings
     */
    public function updateDeliverySettings(Request $request)
    {
        $validated = $request->validate([
            'minimum_order_amount' => 'numeric|min:0',
            'delivery_fee' => 'numeric|min:0',
            'free_delivery_threshold' => 'numeric|min:0',
        ]);

        if (isset($validated['minimum_order_amount'])) {
            StoreSetting::setValue('minimum_order_amount', $validated['minimum_order_amount']);
        }
        if (isset($validated['delivery_fee'])) {
            StoreSetting::setValue('delivery_fee', $validated['delivery_fee']);
        }
        if (isset($validated['free_delivery_threshold'])) {
            StoreSetting::setValue('free_delivery_threshold', $validated['free_delivery_threshold']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Delivery settings updated successfully',
            'data' => [
                'minimum_order_amount' => StoreSetting::getValue('minimum_order_amount', 50),
                'delivery_fee' => StoreSetting::getValue('delivery_fee', 20),
                'free_delivery_threshold' => StoreSetting::getValue('free_delivery_threshold', 200),
            ]
        ]);
    }

    /**
     * Cast value based on type
     */
    private function castValue(string $value, string $type): mixed
    {
        return match ($type) {
            'boolean' => $value === 'true' || $value === '1',
            'number' => is_numeric($value) ? (float) $value : 0,
            'json' => json_decode($value, true) ?? [],
            default => $value,
        };
    }
}
