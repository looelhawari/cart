<?php
/**
 * RBAC System — Complete Test Script
 * Tests all 4 roles, permissions, middleware, and API endpoints
 * Run: php test_rbac.php
 */

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Services\RbacService;

$passed = 0;
$failed = 0;
$errors = [];

function test($name, $condition, &$passed, &$failed, &$errors) {
    if ($condition) {
        echo "  ✅ PASS: {$name}\n";
        $passed++;
    } else {
        echo "  ❌ FAIL: {$name}\n";
        $failed++;
        $errors[] = $name;
    }
}

echo "\n";
echo "╔══════════════════════════════════════════════════════════════╗\n";
echo "║              RBAC SYSTEM — FULL TEST SUITE                  ║\n";
echo "╚══════════════════════════════════════════════════════════════╝\n\n";

// ═══════════════════════════════════════════════════════════════════
// TEST 1: Database tables exist
// ═══════════════════════════════════════════════════════════════════
echo "── 1. DATABASE TABLES ──\n";
test('roles table exists', \Schema::hasTable('roles'), $passed, $failed, $errors);
test('permissions table exists', \Schema::hasTable('permissions'), $passed, $failed, $errors);
test('role_permissions table exists', \Schema::hasTable('role_permissions'), $passed, $failed, $errors);

// ═══════════════════════════════════════════════════════════════════
// TEST 2: Roles seeded correctly
// ═══════════════════════════════════════════════════════════════════
echo "\n── 2. ROLES ──\n";
$roleCount = Role::count();
test("4 roles exist (found: {$roleCount})", $roleCount === 4, $passed, $failed, $errors);

foreach (['owner', 'cashier', 'support', 'store_manager'] as $slug) {
    $role = Role::where('slug', $slug)->first();
    test("Role '{$slug}' exists", $role !== null, $passed, $failed, $errors);
}

// ═══════════════════════════════════════════════════════════════════
// TEST 3: Permissions seeded correctly
// ═══════════════════════════════════════════════════════════════════
echo "\n── 3. PERMISSIONS ──\n";
$permCount = Permission::count();
test("Permissions seeded (found: {$permCount}, expected: 69)", $permCount === 69, $passed, $failed, $errors);

// Check key permissions exist
$keyPerms = ['dashboard.view', 'orders.view', 'orders.manage', 'products.view', 'refunds.view', 'support.view', 'settings.view', 'analytics.view'];
foreach ($keyPerms as $perm) {
    test("Permission '{$perm}' exists", Permission::where('slug', $perm)->exists(), $passed, $failed, $errors);
}

// ═══════════════════════════════════════════════════════════════════
// TEST 4: Role-Permission mappings
// ═══════════════════════════════════════════════════════════════════
echo "\n── 4. ROLE-PERMISSION MAPPINGS ──\n";

$ownerRole = Role::where('slug', 'owner')->first();
$ownerPermCount = $ownerRole->permissions()->count();
test("Owner has ALL permissions (found: {$ownerPermCount}, expected: {$permCount})", $ownerPermCount === $permCount, $passed, $failed, $errors);

$cashierRole = Role::where('slug', 'cashier')->first();
$cashierPerms = $cashierRole->permissions()->pluck('slug')->toArray();
$cashierPermCount = count($cashierPerms);
test("Cashier has permissions (found: {$cashierPermCount}, expected: >10)", $cashierPermCount > 10, $passed, $failed, $errors);
test("Cashier has 'orders.view'", in_array('orders.view', $cashierPerms), $passed, $failed, $errors);
test("Cashier has 'products.manage'", in_array('products.manage', $cashierPerms), $passed, $failed, $errors);
test("Cashier lacks 'dashboard.view'", !in_array('dashboard.view', $cashierPerms), $passed, $failed, $errors);
test("Cashier lacks 'refunds.view'", !in_array('refunds.view', $cashierPerms), $passed, $failed, $errors);
test("Cashier lacks 'settings.view'", !in_array('settings.view', $cashierPerms), $passed, $failed, $errors);

$supportRole = Role::where('slug', 'support')->first();
$supportPerms = $supportRole->permissions()->pluck('slug')->toArray();
$supportPermCount = count($supportPerms);
test("Support has permissions (found: {$supportPermCount}, expected: >5)", $supportPermCount > 5, $passed, $failed, $errors);
test("Support has 'refunds.view'", in_array('refunds.view', $supportPerms), $passed, $failed, $errors);
test("Support has 'support.manage'", in_array('support.manage', $supportPerms), $passed, $failed, $errors);
test("Support has 'orders.view' (read-only)", in_array('orders.view', $supportPerms), $passed, $failed, $errors);
test("Support lacks 'orders.manage'", !in_array('orders.manage', $supportPerms), $passed, $failed, $errors);
test("Support lacks 'products.view'", !in_array('products.view', $supportPerms), $passed, $failed, $errors);

$storeMgrRole = Role::where('slug', 'store_manager')->first();
$storeMgrPerms = $storeMgrRole->permissions()->pluck('slug')->toArray();
$storeMgrPermCount = count($storeMgrPerms);
test("Store Manager has permissions (found: {$storeMgrPermCount})", $storeMgrPermCount > 5, $passed, $failed, $errors);
test("Store Manager has 'settings.manage'", in_array('settings.manage', $storeMgrPerms), $passed, $failed, $errors);
test("Store Manager has 'analytics.view'", in_array('analytics.view', $storeMgrPerms), $passed, $failed, $errors);
test("Store Manager has 'reviews.manage'", in_array('reviews.manage', $storeMgrPerms), $passed, $failed, $errors);
test("Store Manager has 'orders.view'", in_array('orders.view', $storeMgrPerms), $passed, $failed, $errors);
test("Store Manager has 'products.view'", in_array('products.view', $storeMgrPerms), $passed, $failed, $errors);
test("Store Manager has 'promotions.view'", in_array('promotions.view', $storeMgrPerms), $passed, $failed, $errors);

// ═══════════════════════════════════════════════════════════════════
// TEST 5: User accounts exist
// ═══════════════════════════════════════════════════════════════════
echo "\n── 5. USER ACCOUNTS ──\n";

$accounts = [
    ['email' => 'elbaraka.owner.x9k2@elbarakamarket.com', 'role' => 'owner', 'password' => 'Xk$92!qLmT@vR7zW#pNb'],
    ['email' => 'cashier.ops.m4v8@elbarakamarket.com', 'role' => 'cashier', 'password' => 'Cv!48mZr@Nq2xW#7jPsL'],
    ['email' => 'support.desk.t6y3@elbarakamarket.com', 'role' => 'support', 'password' => 'Tp#63kRw!Yb9sV@2mXnQ'],
    ['email' => 'store.mgr.j7w5@elbarakamarket.com', 'role' => 'store_manager', 'password' => 'Jw@75nFx#Qd3tM!8kRvZ'],
];

foreach ($accounts as $acc) {
    $user = User::where('email', $acc['email'])->first();
    test("User '{$acc['role']}' exists (email: {$acc['email']})", $user !== null, $passed, $failed, $errors);
    if ($user) {
        test("  → role is '{$acc['role']}'", $user->role === $acc['role'], $passed, $failed, $errors);
        test("  → isAdmin() returns true", $user->isAdmin(), $passed, $failed, $errors);
        test("  → is_active = true", $user->is_active == true, $passed, $failed, $errors);
        test("  → password verifies", \Hash::check($acc['password'], $user->password), $passed, $failed, $errors);
    }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 6: RbacService
// ═══════════════════════════════════════════════════════════════════
echo "\n── 6. RBAC SERVICE ──\n";

$rbac = new RbacService();

// Owner bypasses all
$owner = User::where('role', 'owner')->first();
test("Owner has 'orders.view' (bypass)", $rbac->userHasPermission($owner, 'orders.view'), $passed, $failed, $errors);
test("Owner has 'some.fake.perm' (bypass)", $rbac->userHasPermission($owner, 'some.fake.perm'), $passed, $failed, $errors);

// Cashier
$cashier = User::where('role', 'cashier')->first();
test("Cashier has 'orders.view'", $rbac->userHasPermission($cashier, 'orders.view'), $passed, $failed, $errors);
test("Cashier has 'products.manage'", $rbac->userHasPermission($cashier, 'products.manage'), $passed, $failed, $errors);
test("Cashier lacks 'dashboard.view'", !$rbac->userHasPermission($cashier, 'dashboard.view'), $passed, $failed, $errors);
test("Cashier lacks 'refunds.view'", !$rbac->userHasPermission($cashier, 'refunds.view'), $passed, $failed, $errors);
test("Cashier lacks 'settings.manage'", !$rbac->userHasPermission($cashier, 'settings.manage'), $passed, $failed, $errors);

// Support
$support = User::where('role', 'support')->first();
test("Support has 'refunds.manage'", $rbac->userHasPermission($support, 'refunds.manage'), $passed, $failed, $errors);
test("Support has 'support.view'", $rbac->userHasPermission($support, 'support.view'), $passed, $failed, $errors);
test("Support has 'orders.view' (read-only)", $rbac->userHasPermission($support, 'orders.view'), $passed, $failed, $errors);
test("Support lacks 'orders.manage'", !$rbac->userHasPermission($support, 'orders.manage'), $passed, $failed, $errors);

// Store Manager
$storeMgr = User::where('role', 'store_manager')->first();
test("StoreMgr has 'settings.manage'", $rbac->userHasPermission($storeMgr, 'settings.manage'), $passed, $failed, $errors);
test("StoreMgr has 'reviews.manage'", $rbac->userHasPermission($storeMgr, 'reviews.manage'), $passed, $failed, $errors);
test("StoreMgr has 'orders.view'", $rbac->userHasPermission($storeMgr, 'orders.view'), $passed, $failed, $errors);
test("StoreMgr has 'products.view'", $rbac->userHasPermission($storeMgr, 'products.view'), $passed, $failed, $errors);
test("StoreMgr has 'promotions.view'", $rbac->userHasPermission($storeMgr, 'promotions.view'), $passed, $failed, $errors);
test("StoreMgr lacks 'orders.manage'", !$rbac->userHasPermission($storeMgr, 'orders.manage'), $passed, $failed, $errors);

// hasAny / hasAll
test("Cashier hasAny(['refunds.view','orders.view'])", $rbac->userHasAnyPermission($cashier, ['refunds.view', 'orders.view']), $passed, $failed, $errors);
test("Cashier !hasAll(['refunds.view','orders.view'])", !$rbac->userHasAllPermissions($cashier, ['refunds.view', 'orders.view']), $passed, $failed, $errors);

// ═══════════════════════════════════════════════════════════════════
// TEST 7: API Login + Permissions Endpoint (HTTP)
// ═══════════════════════════════════════════════════════════════════
echo "\n── 7. API LOGIN + PERMISSIONS ENDPOINT ──\n";

$baseUrl = 'http://127.0.0.1:8000/api/v1';

foreach ($accounts as $acc) {
    // Login
    $ch = curl_init("{$baseUrl}/auth/login");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['email' => $acc['email'], 'password' => $acc['password']]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $loginData = json_decode($resp, true);
    $token = $loginData['data']['access_token'] ?? null;

    test("[{$acc['role']}] Login HTTP {$httpCode} = 200", $httpCode === 200, $passed, $failed, $errors);
    test("[{$acc['role']}] Got access_token", $token !== null, $passed, $failed, $errors);

    if (!$token) {
        echo "    ⚠ Skipping permissions test (no token)\n";
        echo "    Response: " . substr($resp, 0, 200) . "\n";
        continue;
    }

    // Fetch permissions
    $ch = curl_init("{$baseUrl}/admin/rbac/my-permissions");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json', "Authorization: Bearer {$token}"],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $permData = json_decode($resp, true);
    test("[{$acc['role']}] my-permissions HTTP {$httpCode} = 200", $httpCode === 200, $passed, $failed, $errors);

    $permsArray = $permData['data']['permissions'] ?? $permData['permissions'] ?? null;
    test("[{$acc['role']}] permissions returned as array", is_array($permsArray), $passed, $failed, $errors);

    if (is_array($permsArray)) {
        $rolesSeeingDashboard = ['owner', 'store_manager'];
        if (in_array($acc['role'], $rolesSeeingDashboard)) {
            test("[{$acc['role']}] HAS dashboard.view", in_array('dashboard.view', $permsArray), $passed, $failed, $errors);
        } else {
            test("[{$acc['role']}] LACKS dashboard.view", !in_array('dashboard.view', $permsArray), $passed, $failed, $errors);
        }
        $permCountApi = count($permsArray);
        echo "    ℹ {$acc['role']} has {$permCountApi} permissions\n";
    }

    // Test that response structure matches what frontend expects
    echo "    ℹ Response keys: " . implode(', ', array_keys($permData ?? [])) . "\n";
    if (isset($permData['data'])) {
        echo "    ℹ Data keys: " . implode(', ', array_keys($permData['data'])) . "\n";
    }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 8: Permission middleware enforcement
// ═══════════════════════════════════════════════════════════════════
echo "\n── 8. PERMISSION MIDDLEWARE ENFORCEMENT ──\n";

// Login as cashier and try to access refunds (should be 403)
$ch = curl_init("{$baseUrl}/auth/login");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode(['email' => 'cashier.ops.m4v8@elbarakamarket.com', 'password' => 'Cv!48mZr@Nq2xW#7jPsL']),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
    CURLOPT_RETURNTRANSFER => true,
]);
$resp = json_decode(curl_exec($ch), true);
curl_close($ch);
$cashierToken = $resp['data']['access_token'] ?? null;

if ($cashierToken) {
    // Cashier CAN access orders
    $ch = curl_init("{$baseUrl}/admin/orders");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ['Accept: application/json', "Authorization: Bearer {$cashierToken}"],
        CURLOPT_RETURNTRANSFER => true,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    test("Cashier can access /admin/orders (HTTP {$code})", $code === 200, $passed, $failed, $errors);

    // Cashier CANNOT access refunds
    $ch = curl_init("{$baseUrl}/admin/refund-dashboard");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ['Accept: application/json', "Authorization: Bearer {$cashierToken}"],
        CURLOPT_RETURNTRANSFER => true,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    test("Cashier blocked from /admin/refund-dashboard (HTTP {$code} = 403)", $code === 403, $passed, $failed, $errors);

    // Cashier CANNOT access store-settings
    $ch = curl_init("{$baseUrl}/admin/store-settings");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ['Accept: application/json', "Authorization: Bearer {$cashierToken}"],
        CURLOPT_RETURNTRANSFER => true,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    test("Cashier blocked from /admin/store-settings (HTTP {$code} = 403)", $code === 403, $passed, $failed, $errors);
}

// Login as support and test
$ch = curl_init("{$baseUrl}/auth/login");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode(['email' => 'support.desk.t6y3@elbarakamarket.com', 'password' => 'Tp#63kRw!Yb9sV@2mXnQ']),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
    CURLOPT_RETURNTRANSFER => true,
]);
$resp = json_decode(curl_exec($ch), true);
curl_close($ch);
$supportToken = $resp['data']['access_token'] ?? null;

if ($supportToken) {
    // Support CAN access support tickets
    $ch = curl_init("{$baseUrl}/admin/support/tickets");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ['Accept: application/json', "Authorization: Bearer {$supportToken}"],
        CURLOPT_RETURNTRANSFER => true,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    test("Support can access /admin/support/tickets (HTTP {$code})", $code === 200, $passed, $failed, $errors);

    // Support CANNOT access products
    $ch = curl_init("{$baseUrl}/admin/products");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ['Accept: application/json', "Authorization: Bearer {$supportToken}"],
        CURLOPT_RETURNTRANSFER => true,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    test("Support blocked from /admin/products (HTTP {$code} = 403)", $code === 403, $passed, $failed, $errors);
}

// ═══════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════
echo "\n";
echo "╔══════════════════════════════════════════════════════════════╗\n";
echo "║  RESULTS: {$passed} passed, {$failed} failed" . str_repeat(' ', 39 - strlen("{$passed} passed, {$failed} failed")) . "║\n";
echo "╚══════════════════════════════════════════════════════════════╝\n";

if (!empty($errors)) {
    echo "\nFailed tests:\n";
    foreach ($errors as $e) {
        echo "  • {$e}\n";
    }
}

echo "\n";
exit($failed > 0 ? 1 : 0);
