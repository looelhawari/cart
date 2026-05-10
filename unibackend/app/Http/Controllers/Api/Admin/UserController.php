<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'phone' => 'required|string|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:owner,cashier,support,store_manager',
            'is_active' => 'boolean',
            'two_factor_enabled' => 'boolean',
        ]);

        // SECURITY: Only an existing 'owner' may create another 'owner'.
        // Without this, any admin with users.manage could elevate by creating
        // an owner account they control. See AuditFindingsTest.
        if ($validated['role'] === 'owner' && optional($request->user())->role !== 'owner') {
            return response()->json([
                'success' => false,
                'message' => 'Only an existing owner can create owner accounts.',
            ], 403);
        }

        // Mass-assignable subset (after $fillable hardening)
        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name'  => $validated['last_name'],
            'email'      => $validated['email'],
            'phone'      => $validated['phone'],
            'password'   => Hash::make($validated['password']),
        ]);

        // Privileged fields via forceFill — caller has been authorized above.
        $user->forceFill([
            'role'               => $validated['role'],
            'is_active'          => $validated['is_active'] ?? true,
            'two_factor_enabled' => $validated['two_factor_enabled'] ?? false,
            'is_verified'        => true,
            'email_verified_at'  => now(),
        ])->save();

        return response()->json($user, 201);
    }

    public function show($id)
    {
        $user = User::findOrFail($id);
        return response()->json($user);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'phone' => 'sometimes|string|unique:users,phone,' . $id,
            'password' => 'sometimes|string|min:8',
            'role' => 'sometimes|in:owner,cashier,support,store_manager',
            'is_active' => 'sometimes|boolean',
            'two_factor_enabled' => 'sometimes|boolean',
        ]);

        // SECURITY (Chain B): Block role escalation. Without these guards,
        // any admin with users.manage permission could PUT {role: 'owner'}
        // and gain full takeover via RbacController::myPermissions logic.
        if (isset($validated['role'])) {
            $caller = $request->user();
            // Only an owner can set/change someone's role to 'owner'
            if ($validated['role'] === 'owner' && optional($caller)->role !== 'owner') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only an existing owner can grant the owner role.',
                ], 403);
            }
            // No self-role-change at all
            if ($caller && $caller->id === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot change your own role.',
                ], 403);
            }
            // Demoting an existing owner: only another owner may do that
            if ($user->role === 'owner' && optional($caller)->role !== 'owner') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only an owner can modify another owner.',
                ], 403);
            }
        }

        // Split mass-assignable from privileged
        $massSafe = array_intersect_key($validated, array_flip([
            'first_name', 'last_name', 'email', 'phone',
        ]));
        $privileged = array_intersect_key($validated, array_flip([
            'role', 'is_active', 'two_factor_enabled',
        ]));

        if (isset($validated['password'])) {
            $massSafe['password'] = Hash::make($validated['password']);
        }
        if (!empty($massSafe)) {
            $user->update($massSafe);
        }
        if (!empty($privileged)) {
            $user->forceFill($privileged)->save();
        }

        return response()->json($user->refresh());
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);

        // Prevent deleting owner accounts
        if ($user->role === 'owner' && User::where('role', 'owner')->count() === 1) {
            return response()->json([
                'message' => 'Cannot delete the last owner'
            ], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
