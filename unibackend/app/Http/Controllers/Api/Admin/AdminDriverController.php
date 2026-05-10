<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Models\DeliveryZone;
use App\Services\DeliveryZoneService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminDriverController extends Controller
{
    private DeliveryZoneService $zoneService;

    public function __construct(DeliveryZoneService $zoneService)
    {
        $this->zoneService = $zoneService;
    }

    /**
     * List all drivers with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::where('role', 'driver');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('first_name', 'like', "%{$s}%")
                  ->orWhere('last_name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        if ($request->filled('zone_id')) {
            $query->where('assigned_zone_id', $request->zone_id);
        }

        if ($request->filled('is_available')) {
            $query->where('is_available', $request->boolean('is_available'));
        }

        $drivers = $query->with('assignedZone')
            ->withCount([
                'driverOrders as total_orders',
                'driverOrders as active_orders' => fn($q) => $q->whereNotIn('status', ['delivered', 'cancelled', 'failed']),
                'driverOrders as delivered_orders' => fn($q) => $q->where('status', 'delivered'),
            ])
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $drivers,
        ]);
    }

    /**
     * Get single driver details.
     */
    public function show(int $id): JsonResponse
    {
        $driver = User::where('role', 'driver')
            ->with('assignedZone')
            ->withCount([
                'driverOrders as total_orders',
                'driverOrders as active_orders' => fn($q) => $q->whereNotIn('status', ['delivered', 'cancelled', 'failed']),
                'driverOrders as delivered_orders' => fn($q) => $q->where('status', 'delivered'),
            ])
            ->findOrFail($id);

        $recentOrders = Order::where('driver_id', $id)
            ->with('user:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get(['id', 'order_number', 'status', 'delivery_fee', 'created_at', 'user_id']);

        return response()->json([
            'success' => true,
            'data' => [
                'driver' => $driver,
                'recent_orders' => $recentOrders,
            ],
        ]);
    }

    /**
     * Create a new driver.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string|max:20',
            'password' => 'required|string|min:8',
            'vehicle_type' => 'nullable|string|in:motorcycle,car,bicycle,van',
            'vehicle_plate' => 'nullable|string|max:20',
            'assigned_zone_id' => 'nullable|integer|exists:delivery_zones,id',
        ]);

        // Privilege fields (role, assigned_zone_id, email_verified_at) are no
        // longer in $fillable (security hardening). Set via forceFill() since
        // an admin with users.manage permission is authorized to create drivers.
        $driver = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'vehicle_type' => $request->vehicle_type,
            'vehicle_plate' => $request->vehicle_plate,
            'is_available' => false,
        ]);
        $driver->forceFill([
            'role' => 'driver',
            'assigned_zone_id' => $request->assigned_zone_id ?: null,
            'email_verified_at' => now(),
            'is_active' => true,
            'is_verified' => true,
        ])->save();

        return response()->json([
            'success' => true,
            'message' => 'Driver created successfully',
            'data' => $driver->load('assignedZone'),
        ], 201);
    }

    /**
     * Update a driver.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $driver = User::where('role', 'driver')->findOrFail($id);

        $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'phone' => 'sometimes|string|max:20',
            'password' => 'sometimes|string|min:8',
            'vehicle_type' => 'nullable|string|in:motorcycle,car,bicycle,van',
            'vehicle_plate' => 'nullable|string|max:20',
            'assigned_zone_id' => 'nullable|integer|exists:delivery_zones,id',
            'is_available' => 'sometimes|boolean',
        ]);

        $data = $request->only([
            'first_name', 'last_name', 'email', 'phone',
            'vehicle_type', 'vehicle_plate', 'is_available',
        ]);

        // Handle assigned_zone_id explicitly
        if ($request->has('assigned_zone_id')) {
            $data['assigned_zone_id'] = $request->assigned_zone_id ?: null;
        }

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $driver->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Driver updated successfully',
            'data' => $driver->fresh()->load('assignedZone'),
        ]);
    }

    /**
     * Delete a driver (soft-reset role to customer).
     */
    public function destroy(int $id): JsonResponse
    {
        $driver = User::where('role', 'driver')->findOrFail($id);

        // Check for active orders
        $activeOrders = Order::where('driver_id', $id)
            ->whereNotIn('status', ['delivered', 'cancelled', 'failed'])
            ->count();

        if ($activeOrders > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete driver with active orders. Reassign orders first.',
            ], 422);
        }

        $driver->update([
            'role' => 'customer',
            'assigned_zone_id' => null,
            'is_available' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Driver removed successfully',
        ]);
    }

    /**
     * Assign driver to a specific order (manual assignment).
     */
    public function assignDriverToOrder(Request $request, int $orderId): JsonResponse
    {
        $request->validate([
            'driver_id' => 'required|exists:users,id',
        ]);

        $order = Order::findOrFail($orderId);
        $driver = User::where('id', $request->driver_id)->where('role', 'driver')->firstOrFail();

        $order->update([
            'driver_id' => $driver->id,
            'driver_assigned_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Driver assigned to order successfully',
            'data' => $order->fresh()->load('driver:id,first_name,last_name,phone'),
        ]);
    }

    /**
     * Get available drivers for a specific zone (for assignment dropdown).
     */
    public function availableDrivers(Request $request): JsonResponse
    {
        $query = User::where('role', 'driver')
            ->where('is_available', true);

        if ($request->filled('zone_id')) {
            $query->where('assigned_zone_id', $request->zone_id);
        }

        $drivers = $query->select('id', 'first_name', 'last_name', 'phone', 'assigned_zone_id', 'current_lat', 'current_lng', 'average_rating', 'total_deliveries')
            ->withCount(['driverOrders as active_orders' => fn($q) => $q->whereNotIn('status', ['delivered', 'cancelled', 'failed'])])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $drivers,
        ]);
    }

    /**
     * Get driver performance stats.
     */
    public function performance(Request $request): JsonResponse
    {
        $period = $request->input('period', '7d');
        $dateFrom = match ($period) {
            '1d' => now()->subDay(),
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            default => now()->subDays(7),
        };

        $drivers = User::where('role', 'driver')
            ->with('assignedZone:id,name,name_ar')
            ->get()
            ->map(function ($driver) use ($dateFrom) {
                $orders = Order::where('driver_id', $driver->id)
                    ->where('created_at', '>=', $dateFrom);
                $delivered = (clone $orders)->where('status', 'delivered');

                // Calculate average delivery time
                $avgDeliveryMinutes = Order::where('driver_id', $driver->id)
                    ->where('created_at', '>=', $dateFrom)
                    ->where('status', 'delivered')
                    ->whereNotNull('driver_picked_up_at')
                    ->whereNotNull('actual_delivered_at')
                    ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, driver_picked_up_at, actual_delivered_at)) as avg_minutes')
                    ->value('avg_minutes');

                return [
                    'id' => $driver->id,
                    'name' => trim($driver->first_name . ' ' . $driver->last_name),
                    'phone' => $driver->phone,
                    'zone' => $driver->assignedZone,
                    'is_available' => $driver->is_available,
                    'total_orders' => $orders->count(),
                    'delivered' => $delivered->count(),
                    'earnings' => round($delivered->sum('delivery_fee'), 2),
                    'average_rating' => (float) $driver->average_rating,
                    'avg_delivery_minutes' => $avgDeliveryMinutes ? round($avgDeliveryMinutes, 1) : null,
                ];
            })
            ->sortByDesc('delivered')
            ->values();

        return response()->json([
            'success' => true,
            'data' => $drivers,
        ]);
    }

    /**
     * Get all driver locations for live map.
     */
    public function locations(): JsonResponse
    {
        $drivers = User::where('role', 'driver')
            ->whereNotNull('current_lat')
            ->whereNotNull('current_lng')
            ->select('id', 'first_name', 'last_name', 'current_lat', 'current_lng', 'location_updated_at', 'is_available', 'assigned_zone_id')
            ->withCount(['driverOrders as active_orders' => fn($q) => $q->whereNotIn('status', ['delivered', 'cancelled', 'failed'])])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $drivers,
        ]);
    }
}
