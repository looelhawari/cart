<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    /**
     * List all customers
     */
    /**
     * List all customers with advanced filtering
     */
    public function index(Request $request)
    {
        $query = User::where('role', 'customer');

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('is_cod_restricted')) {
            $query->where('is_cod_restricted', filter_var($request->is_cod_restricted, FILTER_VALIDATE_BOOLEAN));
        }
        
        if ($request->filled('is_vip')) {
             $query->where('is_vip', filter_var($request->is_vip, FILTER_VALIDATE_BOOLEAN));
        }

        // Date Ranges
        if ($request->filled('registration_date_from')) {
            $query->whereDate('created_at', '>=', $request->registration_date_from);
        }
        if ($request->filled('registration_date_to')) {
            $query->whereDate('created_at', '<=', $request->registration_date_to);
        }

        // Area Filter (via latest address)
        if ($request->filled('area')) {
            $query->whereHas('addresses', function($q) use ($request) {
                $q->where('city', 'like', "%{$request->area}%")
                  ->orWhere('area', 'like', "%{$request->area}%");
            });
        }

        // Segmentation
        if ($request->filled('segment')) {
            switch ($request->segment) {
                case 'vip':
                    $query->where('is_vip', true);
                    break;
                case 'inactive_30d':
                    $query->whereDoesntHave('orders', function($q) {
                        $q->where('created_at', '>=', now()->subDays(30));
                    });
                    break;
                case 'high_spenders':
                    // Top 10% spenders logic is hard in SQL directly without subqueries, 
                    // simplifying to > 10000 for now or user defined
                    $query->has('orders'); // Placeholder for complex logic
                    break;
            }
        }

        // Sorting
        $sortField = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $allowedSorts = ['created_at', 'orders_count', 'orders_sum_total', 'last_login_at'];
        
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'created_at';
        }

        $customers = $query->withCount('orders')
            ->withSum('orders', 'total')
            ->with(['defaultAddress']) // Eager load default address for "Area" column
            ->orderBy($sortField, $sortOrder)
            ->paginate($request->get('per_page', 20));

        return response()->json($customers);
    }

    /**
     * Show customer details with analytics
     */
    public function show($id)
    {
        $customer = User::where('role', 'customer')
            ->with([
                'addresses', 
                'defaultAddress',
                'orders' => fn($q) => $q->latest()->limit(50), 
                'complaints' => fn($q) => $q->latest(), 
                'wallet',
                'notes.author' // Internal notes
            ])
            ->withCount('orders')
            ->withSum('orders', 'total')
            ->findOrFail($id);
            
        // Analytics
        $totalOrders = $customer->orders->count();
        $cancelledOrders = $customer->orders->where('status', 'cancelled')->count();
        $cancelRate = $totalOrders > 0 ? round(($cancelledOrders / $totalOrders) * 100, 1) : 0;
        
        $ltv = $customer->orders->where('status', '!=', 'cancelled')->sum('total');
        $avgOrderValue = $totalOrders > 0 ? round($ltv / $totalOrders, 2) : 0;

        $customer->analytics = [
            'ltv' => $ltv,
            'avg_order_value' => $avgOrderValue,
            'cancel_rate' => $cancelRate,
            'total_orders' => $totalOrders,
        ];
            
        return response()->json($customer);
    }

    /**
     * Update customer flags (Block, COD Restrict, VIP)
     */
    public function update(Request $request, $id)
    {
        $customer = User::where('role', 'customer')->findOrFail($id);
        
        $validated = $request->validate([
            'is_active' => 'sometimes|boolean',
            'is_cod_restricted' => 'sometimes|boolean',
            'is_vip' => 'sometimes|boolean',
            'max_order_value' => 'nullable|numeric|min:0',
        ]);

        $customer->update($validated);
        
        if (isset($validated['is_active']) && !$validated['is_active']) {
             $customer->tokens()->delete(); // Logout if banned
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Customer profile updated successfully',
            'data' => $customer
        ]);
    }

    /**
     * Add an internal note
     */
    public function storeNote(Request $request, $id)
    {
        $customer = User::where('role', 'customer')->findOrFail($id);
        
        $validated = $request->validate([
            'note' => 'required|string|max:1000',
            'is_visible_to_customer' => 'boolean'
        ]);

        $note = $customer->notes()->create([
            'author_id' => $request->user()->id,
            'note' => $validated['note'],
            'is_visible_to_customer' => $validated['is_visible_to_customer'] ?? false,
        ]);

        return response()->json($note->load('author'));
    }

    /**
     * Reset customer password manually
     */
    public function resetPassword(Request $request, $id)
    {
        $customer = User::where('role', 'customer')->findOrFail($id);
        
        $validated = $request->validate([
            'password' => 'required|string|min:8|confirmed'
        ]);

        $customer->update([
            'password' => \Illuminate\Support\Facades\Hash::make($validated['password'])
        ]);

        // Revoke all tokens to force re-login with new password
        $customer->tokens()->delete();

        return response()->json(['message' => 'Password reset successfully']);
    }

    /**
     * Get customer activity logs
     */
    public function activity($id)
    {
        $customer = User::where('role', 'customer')->findOrFail($id);
        
        $logs = \App\Models\AdminLog::where('entity_type', 'User')
            ->where('entity_id', $id)
            ->orWhere(function($q) use ($id) {
                $q->where('module', 'Orders')
                  ->whereHas('entity', function($query) use ($id) {
                      $query->where('user_id', $id);
                  });
            })
            ->with('user')
            ->latest()
            ->paginate(20);
            
        return response()->json($logs);
    }

    /**
     * Get customer statistics for dashboard
     */
    public function stats(Request $request)
    {
        $query = User::where('role', 'customer');

        // Apply date filters if provided
        if ($request->filled('start_date')) {
            $query->where('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->where('created_at', '<=', $request->end_date);
        }

        $totalCustomers = $query->count();
        $activeCustomers = (clone $query)->where('is_active', true)->count();
        $vipCustomers = (clone $query)->where('is_vip', true)->count();
        $codRestrictedCustomers = (clone $query)->where('is_cod_restricted', true)->count();

        // New customers (last 30 days)
        $newCustomersLast30Days = User::where('role', 'customer')
            ->where('created_at', '>=', now()->subDays(30))
            ->count();

        // Customers with orders
        $customersWithOrders = User::where('role', 'customer')
            ->has('orders')
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_customers' => $totalCustomers,
                'active_customers' => $activeCustomers,
                'vip_customers' => $vipCustomers,
                'cod_restricted_customers' => $codRestrictedCustomers,
                'new_customers_last_30_days' => $newCustomersLast30Days,
                'customers_with_orders' => $customersWithOrders,
                'conversion_rate' => $totalCustomers > 0 ? round(($customersWithOrders / $totalCustomers) * 100, 2) : 0,
            ]
        ]);
    }
}
