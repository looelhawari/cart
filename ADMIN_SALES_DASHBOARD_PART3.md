# ELBARAKA - Admin & Sales Dashboard (PART 3)
## Modules 6-7, Architecture, Security, Deployment & Lovable Integration

---

## 10. MODULE 6: USER MANAGEMENT & ROLES

### 10.1 Overview

**Purpose**: Manage admin users, assign roles, control permissions, track user activity, and maintain secure access control across the dashboard.

**Database Tables**:
- `users` (with role field for admin users)
- `activity_log` (audit trail of all actions)
- `sessions` (active user sessions)

**Admin Roles**:
1. **super_admin** - Full system access, can manage all users and settings
2. **admin** - Most permissions, cannot delete super_admins
3. **sales_manager** - Focus on orders, products, customers
4. **accountant** - Financial data, reports, payment reconciliation
5. **customer_support** - Support tickets, customer inquiries only

**Key Features**:
- Create/edit/delete admin users
- Assign and change roles
- Enable/disable user accounts
- Password reset for admin users
- Activity log and audit trail
- Session management
- Two-factor authentication (2FA) setup
- Permission matrix visualization

### 10.2 Permission Matrix

| Feature/Action | Super Admin | Admin | Sales Manager | Accountant | Customer Support |
|----------------|-------------|-------|---------------|------------|------------------|
| **Products** |
| View Products | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Product | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Product | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete Product | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Categories** |
| View Categories | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Category | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Category | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Category | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Orders** |
| View Orders | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Order Status | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cancel Order | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Customer Support** |
| View Tickets | ✅ | ✅ | ❌ | ❌ | ✅ |
| Reply to Tickets | ✅ | ✅ | ❌ | ❌ | ✅ |
| Close Tickets | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Financial** |
| View Revenue Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Transactions | ✅ | ✅ | ❌ | ✅ | ❌ |
| Process Refunds | ✅ | ✅ | ❌ | ✅ | ❌ |
| Export Financial Reports | ✅ | ✅ | ❌ | ✅ | ❌ |
| **User Management** |
| View Admin Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Admin User | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Admin User | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Admin User | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change User Role | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Analytics** |
| View Analytics Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export Reports | ✅ | ✅ | ✅ | ✅ | ❌ |
| **System Settings** |
| Manage Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Activity Log | ✅ | ✅ | ❌ | ❌ | ❌ |

### 10.3 Database Schema

```sql
-- Users table (admin role field)
-- Note: User table already exists, role ENUM includes admin roles

-- Activity Log (Audit Trail)
CREATE TABLE activity_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    log_name VARCHAR(255) NULL,
    description TEXT NOT NULL,
    subject_type VARCHAR(255) NULL,
    subject_id BIGINT UNSIGNED NULL,
    causer_type VARCHAR(255) NULL,
    causer_id BIGINT UNSIGNED NULL,
    properties JSON NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    INDEX idx_subject (subject_type, subject_id),
    INDEX idx_causer (causer_type, causer_id),
    INDEX idx_log_name (log_name),
    INDEX idx_created_at (created_at)
);

-- Sessions table
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    payload LONGTEXT NOT NULL,
    last_activity INT NOT NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_last_activity (last_activity)
);

-- Two-Factor Authentication
CREATE TABLE two_factor_auth (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    secret VARCHAR(255) NOT NULL,
    recovery_codes JSON NULL,
    enabled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_2fa (user_id)
);
```

### 10.4 API Endpoints

#### 10.4.1 List Admin Users

**Endpoint**: `GET /api/v1/admin/users`

**Authorization**: `super_admin`, `admin`

**Query Parameters**:
```typescript
interface AdminUserListParams {
  page?: number;
  per_page?: number;
  search?: string;  // Search by name or email
  role?: AdminRole | AdminRole[];
  status?: 'active' | 'inactive';
  sort_by?: 'created_at' | 'name' | 'last_login';
  sort_order?: 'asc' | 'desc';
}

type AdminRole = 'super_admin' | 'admin' | 'sales_manager' | 'accountant' | 'customer_support';
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "first_name": "Admin",
      "last_name": "User",
      "email": "admin@elbaraka.com",
      "phone": "+201000000000",
      "role": "super_admin",
      "is_active": true,
      "email_verified_at": "2025-01-01T00:00:00Z",
      "two_factor_enabled": true,
      "last_login_at": "2026-01-25T08:30:00Z",
      "last_login_ip": "192.168.1.1",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2026-01-25T08:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 12,
    "last_page": 1
  },
  "summary": {
    "total_users": 12,
    "active_users": 10,
    "inactive_users": 2,
    "by_role": {
      "super_admin": 2,
      "admin": 3,
      "sales_manager": 2,
      "accountant": 2,
      "customer_support": 3
    }
  }
}
```

#### 10.4.2 Create Admin User

**Endpoint**: `POST /api/v1/admin/users`

**Authorization**: `super_admin`, `admin`

**Request Body**:
```json
{
  "first_name": "Sarah",
  "last_name": "Manager",
  "email": "sarah.manager@elbaraka.com",
  "phone": "+201234567890",
  "password": "SecurePassword123!",
  "password_confirmation": "SecurePassword123!",
  "role": "sales_manager",
  "send_welcome_email": true
}
```

**Validation**:
```php
return [
    'first_name' => 'required|string|max:255',
    'last_name' => 'required|string|max:255',
    'email' => 'required|email|unique:users,email',
    'phone' => 'required|string|unique:users,phone',
    'password' => 'required|string|min:8|confirmed',
    'role' => 'required|in:super_admin,admin,sales_manager,accountant,customer_support',
    'send_welcome_email' => 'boolean',
];
```

**Response**:
```json
{
  "message": "Admin user created successfully",
  "data": {
    "id": 13,
    "first_name": "Sarah",
    "last_name": "Manager",
    "email": "sarah.manager@elbaraka.com",
    "role": "sales_manager",
    "created_at": "2026-01-25T10:00:00Z"
  }
}
```

**Backend Implementation**:

```php
// app/Http/Controllers/Admin/UserManagementController.php
public function store(Request $request)
{
    // Authorization check
    if (auth()->user()->role !== 'super_admin' && auth()->user()->role !== 'admin') {
        return response()->json(['message' => 'Unauthorized'], 403);
    }
    
    // Non-super_admin cannot create super_admin
    if (auth()->user()->role !== 'super_admin' && $request->role === 'super_admin') {
        return response()->json(['message' => 'Cannot create super admin users'], 403);
    }
    
    $validated = $request->validate([
        'first_name' => 'required|string|max:255',
        'last_name' => 'required|string|max:255',
        'email' => 'required|email|unique:users,email',
        'phone' => 'required|string|unique:users,phone',
        'password' => 'required|string|min:8|confirmed',
        'role' => 'required|in:super_admin,admin,sales_manager,accountant,customer_support',
        'send_welcome_email' => 'boolean',
    ]);
    
    DB::transaction(function() use ($validated, $request) {
        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'email_verified_at' => now(), // Auto-verify admin emails
            'is_active' => true,
        ]);
        
        // Log activity
        activity()
            ->performedOn($user)
            ->causedBy(auth()->user())
            ->withProperties(['role' => $validated['role']])
            ->log('admin_user_created');
        
        // Send welcome email if requested
        if ($validated['send_welcome_email'] ?? false) {
            $user->notify(new AdminWelcomeNotification($validated['password']));
        }
        
        return $user;
    });
    
    return response()->json([
        'message' => 'Admin user created successfully',
        'data' => new UserResource($user),
    ], 201);
}
```

#### 10.4.3 Update Admin User

**Endpoint**: `PUT /api/v1/admin/users/{id}`

**Authorization**: `super_admin`, `admin`

**Request Body**:
```json
{
  "first_name": "Sarah",
  "last_name": "Manager Updated",
  "email": "sarah.manager@elbaraka.com",
  "phone": "+201234567890",
  "role": "admin",
  "is_active": true
}
```

**Response**:
```json
{
  "message": "Admin user updated successfully",
  "data": { /* updated user */ }
}
```

#### 10.4.4 Delete Admin User

**Endpoint**: `DELETE /api/v1/admin/users/{id}`

**Authorization**: `super_admin` only

**Response**:
```json
{
  "message": "Admin user deleted successfully"
}
```

**Backend Implementation**:

```php
public function destroy($id)
{
    // Only super_admin can delete users
    if (auth()->user()->role !== 'super_admin') {
        return response()->json(['message' => 'Unauthorized'], 403);
    }
    
    $user = User::findOrFail($id);
    
    // Cannot delete yourself
    if ($user->id === auth()->id()) {
        return response()->json(['message' => 'Cannot delete your own account'], 422);
    }
    
    // Cannot delete the last super_admin
    if ($user->role === 'super_admin') {
        $superAdminCount = User::where('role', 'super_admin')->count();
        if ($superAdminCount <= 1) {
            return response()->json(['message' => 'Cannot delete the last super admin'], 422);
        }
    }
    
    // Log before deletion
    activity()
        ->performedOn($user)
        ->causedBy(auth()->user())
        ->withProperties($user->toArray())
        ->log('admin_user_deleted');
    
    $user->delete();
    
    return response()->json(['message' => 'Admin user deleted successfully']);
}
```

#### 10.4.5 Activity Log

**Endpoint**: `GET /api/v1/admin/activity-log`

**Authorization**: `super_admin`, `admin`

**Query Parameters**:
```typescript
interface ActivityLogParams {
  page?: number;
  per_page?: number;
  user_id?: number;  // Filter by user who performed action
  subject_type?: string;  // e.g., 'Product', 'Order'
  subject_id?: number;
  date_from?: string;
  date_to?: string;
  action?: string;  // e.g., 'created', 'updated', 'deleted'
}
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "description": "admin_user_created",
      "causer": {
        "id": 1,
        "name": "Admin User",
        "role": "super_admin"
      },
      "subject_type": "User",
      "subject_id": 13,
      "properties": {
        "role": "sales_manager"
      },
      "created_at": "2026-01-25T10:00:00Z"
    },
    {
      "id": 2,
      "description": "product_updated",
      "causer": {
        "id": 5,
        "name": "Sarah Manager",
        "role": "sales_manager"
      },
      "subject_type": "Product",
      "subject_id": 6221234567890,
      "properties": {
        "changes": {
          "price": {
            "old": "25.00",
            "new": "30.00"
          }
        }
      },
      "created_at": "2026-01-25T09:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 1234,
    "last_page": 25
  }
}
```

#### 10.4.6 Enable Two-Factor Authentication

**Endpoint**: `POST /api/v1/admin/users/{id}/enable-2fa`

**Authorization**: User can enable for themselves, or `super_admin`

**Response**:
```json
{
  "message": "Two-factor authentication enabled",
  "data": {
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "secret": "JBSWY3DPEHPK3PXP",
    "recovery_codes": [
      "12345-67890",
      "23456-78901",
      "34567-89012"
    ]
  }
}
```

### 10.5 Frontend Pages

#### 10.5.1 Admin Users List Page

**Route**: `/admin/users`

**Components**:

- **Summary Cards**:
  - Total Admin Users
  - Active Users
  - Inactive Users
  - Users by Role (breakdown)

- **Filters Panel**:
  - Search (name, email)
  - Role multi-select
  - Status (Active/Inactive)

- **Data Table** with columns:
  - Avatar + Name
  - Email
  - Phone
  - Role Badge (color-coded)
  - Status Badge (Active/Inactive)
  - 2FA Enabled Icon
  - Last Login (with time ago)
  - Actions (Edit, Delete, Reset Password, View Activity)

- **Toolbar**:
  - "Add New User" button (primary)
  - Export CSV

#### 10.5.2 Create/Edit User Modal

**Components**:
- First Name input
- Last Name input
- Email input
- Phone input
- Password input (for create)
- Password Confirmation (for create)
- Role select dropdown
- Active/Inactive toggle
- Send Welcome Email checkbox (for create)
- Save button

#### 10.5.3 Activity Log Page

**Route**: `/admin/activity-log`

**Components**:

- **Filters Panel**:
  - User dropdown (who performed action)
  - Subject Type dropdown (Product, Order, User, etc.)
  - Date range picker
  - Action type dropdown

- **Timeline View** (alternative to table):
  - Chronological list of activities
  - User avatar + name
  - Action description (e.g., "created new product")
  - Subject link (clickable)
  - Properties/changes expandable
  - Timestamp

- **Data Table View** with columns:
  - Timestamp
  - User (who performed action)
  - Action Type
  - Subject (what was affected)
  - Details (expandable JSON)

### 10.6 Frontend Implementation Example

```typescript
// pages/admin/users/index.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { UserFormModal } from '@/components/admin/UserFormModal';
import { userManagementApi } from '@/services/api/userManagementApi';

export default function AdminUsersPage() {
  const [filters, setFilters] = useState({
    search: '',
    role: [],
    status: 'all',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => userManagementApi.getUsers(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => userManagementApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deleted successfully');
    },
  });

  const handleDelete = (user: User) => {
    if (confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <img
            src={row.original.avatar || '/default-avatar.png'}
            alt={`${row.original.first_name} ${row.original.last_name}`}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <div className="font-medium">
              {row.original.first_name} {row.original.last_name}
            </div>
            <div className="text-sm text-gray-500">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      accessorKey: 'two_factor_enabled',
      header: '2FA',
      cell: ({ row }) => (
        row.original.two_factor_enabled ? (
          <CheckCircleIcon className="w-5 h-5 text-green-500" />
        ) : (
          <XCircleIcon className="w-5 h-5 text-gray-300" />
        )
      ),
    },
    {
      accessorKey: 'last_login_at',
      header: 'Last Login',
      cell: ({ row }) => (
        <div>
          <div className="text-sm">{formatDistanceToNow(new Date(row.original.last_login_at))} ago</div>
          <div className="text-xs text-gray-500">{row.original.last_login_ip}</div>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original)}>
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => viewActivity(row.original.id)}>
            Activity
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Users</h1>
        <Button onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>
          Add New User
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <MetricCard title="Total Users" value={data?.summary.total_users} />
        <MetricCard title="Active Users" value={data?.summary.active_users} />
        <MetricCard title="Inactive Users" value={data?.summary.inactive_users} />
        <MetricCard
          title="By Role"
          value={
            <div className="text-sm space-y-1">
              {Object.entries(data?.summary.by_role || {}).map(([role, count]) => (
                <div key={role}>
                  <RoleBadge role={role} /> {count}
                </div>
              ))}
            </div>
          }
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4">
          <Input
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="max-w-md"
          />
          <Select
            value={filters.role}
            onChange={(value) => setFilters({ ...filters, role: value })}
            multiple
            placeholder="Filter by role"
          >
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="sales_manager">Sales Manager</option>
            <option value="accountant">Accountant</option>
            <option value="customer_support">Customer Support</option>
          </Select>
          <Select
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          pagination={data?.meta}
        />
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={editingUser}
      />
    </div>
  );
}
```

---

## 11. MODULE 7: ANALYTICS & REPORTING

### 11.1 Overview

**Purpose**: Provide comprehensive business intelligence through visual analytics, charts, and downloadable reports for data-driven decision making.

**Key Features**:
- Sales analytics (daily/weekly/monthly trends)
- Product performance analysis
- Customer behavior insights
- Category performance comparison
- Revenue forecasting
- Geographical sales distribution
- Peak hours analysis
- Custom date range reports
- Export to CSV/Excel/PDF

### 11.2 API Endpoints

#### 11.2.1 Sales Analytics Dashboard

**Endpoint**: `GET /api/v1/admin/analytics/sales`

**Query Parameters**:
```typescript
interface SalesAnalyticsParams {
  date_from: string;
  date_to: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  compare_previous?: boolean;
}
```

**Response**:
```json
{
  "data": {
    "summary": {
      "total_revenue": "125,450.00",
      "total_orders": 420,
      "average_order_value": "298.69",
      "unique_customers": 245,
      "returning_customers": 175,
      "new_customers": 70,
      "conversion_rate": 68.5
    },
    "time_series": [
      {
        "date": "2026-01-01",
        "revenue": "4,250.00",
        "orders": 15,
        "customers": 12,
        "average_order_value": "283.33"
      }
    ],
    "top_selling_products": [
      {
        "product_id": 6221234567890,
        "name": "Organic Apples",
        "category": "Fruits & Vegetables",
        "units_sold": 450,
        "revenue": "6,750.00",
        "growth_percentage": 15.2
      }
    ],
    "top_categories": [
      {
        "category_id": 1,
        "name": "Fruits & Vegetables",
        "revenue": "45,320.00",
        "orders_count": 156,
        "percentage_of_total": 36.1
      }
    ],
    "hourly_distribution": [
      {
        "hour": 9,
        "orders_count": 25,
        "revenue": "7,450.00"
      }
    ],
    "comparison": {
      "revenue_change": 27.6,
      "orders_change": 18.4,
      "aov_change": 7.8
    }
  }
}
```

**Backend Implementation**:

```php
// app/Http/Controllers/Admin/AnalyticsController.php
public function salesAnalytics(Request $request)
{
    $validated = $request->validate([
        'date_from' => 'required|date',
        'date_to' => 'required|date|after_or_equal:date_from',
        'granularity' => 'nullable|in:daily,weekly,monthly',
        'compare_previous' => 'boolean',
    ]);
    
    $dateFrom = Carbon::parse($validated['date_from']);
    $dateTo = Carbon::parse($validated['date_to']);
    $granularity = $validated['granularity'] ?? 'daily';
    
    // Summary metrics
    $summary = $this->calculateSalesSummary($dateFrom, $dateTo);
    
    // Time series data
    $timeSeries = $this->getTimeSeries($dateFrom, $dateTo, $granularity);
    
    // Top selling products
    $topProducts = OrderItem::join('orders', 'order_items.order_id', '=', 'orders.id')
        ->join('products', 'order_items.product_id', '=', 'products.barcode')
        ->whereBetween('orders.created_at', [$dateFrom, $dateTo])
        ->where('orders.payment_status', 'completed')
        ->selectRaw('
            products.barcode as product_id,
            products.name,
            products.category,
            SUM(order_items.quantity) as units_sold,
            SUM(order_items.price * order_items.quantity) as revenue
        ')
        ->groupBy('products.barcode')
        ->orderByDesc('revenue')
        ->limit(10)
        ->get();
    
    // Top categories
    $topCategories = Order::join('order_items', 'orders.id', '=', 'order_items.order_id')
        ->join('products', 'order_items.product_id', '=', 'products.barcode')
        ->join('categories', 'products.category_id', '=', 'categories.id')
        ->whereBetween('orders.created_at', [$dateFrom, $dateTo])
        ->where('orders.payment_status', 'completed')
        ->selectRaw('
            categories.id as category_id,
            categories.name,
            SUM(order_items.price * order_items.quantity) as revenue,
            COUNT(DISTINCT orders.id) as orders_count
        ')
        ->groupBy('categories.id')
        ->orderByDesc('revenue')
        ->limit(10)
        ->get();
    
    $totalRevenue = $summary['total_revenue'];
    $topCategories->transform(function($category) use ($totalRevenue) {
        $category->percentage_of_total = round(($category->revenue / $totalRevenue) * 100, 2);
        return $category;
    });
    
    // Hourly distribution
    $hourlyDistribution = Order::selectRaw('
            HOUR(created_at) as hour,
            COUNT(*) as orders_count,
            SUM(total) as revenue
        ')
        ->whereBetween('created_at', [$dateFrom, $dateTo])
        ->where('payment_status', 'completed')
        ->groupBy('hour')
        ->orderBy('hour')
        ->get();
    
    // Comparison with previous period
    $comparison = null;
    if ($validated['compare_previous']) {
        $comparison = $this->comparePreviousPeriod($dateFrom, $dateTo);
    }
    
    return response()->json([
        'data' => [
            'summary' => $summary,
            'time_series' => $timeSeries,
            'top_selling_products' => $topProducts,
            'top_categories' => $topCategories,
            'hourly_distribution' => $hourlyDistribution,
            'comparison' => $comparison,
        ],
    ]);
}

private function calculateSalesSummary($dateFrom, $dateTo)
{
    $orders = Order::whereBetween('created_at', [$dateFrom, $dateTo])
        ->where('payment_status', 'completed');
    
    return [
        'total_revenue' => $orders->sum('total'),
        'total_orders' => $orders->count(),
        'average_order_value' => $orders->avg('total'),
        'unique_customers' => $orders->distinct('user_id')->count('user_id'),
        'returning_customers' => User::whereHas('orders', function($q) use ($dateFrom, $dateTo) {
            $q->whereBetween('created_at', [$dateFrom, $dateTo]);
        })->whereHas('orders', function($q) use ($dateFrom) {
            $q->where('created_at', '<', $dateFrom);
        })->count(),
        'new_customers' => User::whereHas('orders', function($q) use ($dateFrom, $dateTo) {
            $q->whereBetween('created_at', [$dateFrom, $dateTo]);
        })->whereDoesntHave('orders', function($q) use ($dateFrom) {
            $q->where('created_at', '<', $dateFrom);
        })->count(),
    ];
}
```

#### 11.2.2 Product Performance Analytics

**Endpoint**: `GET /api/v1/admin/analytics/products`

**Response**:
```json
{
  "data": {
    "best_performers": [
      {
        "product_id": 6221234567890,
        "name": "Organic Apples",
        "units_sold": 450,
        "revenue": "6,750.00",
        "profit": "2,250.00",
        "profit_margin": 33.3,
        "growth_rate": 15.2
      }
    ],
    "underperformers": [
      {
        "product_id": 6229876543210,
        "name": "Exotic Fruit Mix",
        "units_sold": 12,
        "revenue": "360.00",
        "profit": "60.00",
        "profit_margin": 16.7,
        "growth_rate": -8.5
      }
    ],
    "out_of_stock_impact": {
      "total_products_out_of_stock": 8,
      "estimated_lost_revenue": "2,450.00",
      "estimated_lost_orders": 35
    }
  }
}
```

#### 11.2.3 Customer Analytics

**Endpoint**: `GET /api/v1/admin/analytics/customers`

**Response**:
```json
{
  "data": {
    "customer_segments": {
      "high_value": {
        "count": 45,
        "percentage": 18.4,
        "avg_lifetime_value": "8,450.00",
        "avg_order_frequency": 12.5
      },
      "medium_value": {
        "count": 120,
        "percentage": 49.0,
        "avg_lifetime_value": "2,850.00",
        "avg_order_frequency": 5.2
      },
      "low_value": {
        "count": 80,
        "percentage": 32.6,
        "avg_lifetime_value": "450.00",
        "avg_order_frequency": 1.5
      }
    },
    "retention_rate": {
      "month_1": 85.0,
      "month_3": 68.0,
      "month_6": 52.0,
      "month_12": 38.0
    },
    "churn_analysis": {
      "churned_customers": 45,
      "at_risk_customers": 28,
      "estimated_lost_revenue": "15,680.00"
    }
  }
}
```

### 11.3 Frontend Pages

#### 11.3.1 Analytics Dashboard Page

**Route**: `/admin/analytics`

**Components**:

1. **Date Range Selector** (Top):
   - Quick filters (Last 7 days, Last 30 days, This Month, Last Month, Custom)
   - Compare with previous period toggle

2. **KPI Summary Cards**:
   - Total Revenue (with trend)
   - Total Orders (with trend)
   - Average Order Value (with trend)
   - Conversion Rate (with trend)

3. **Charts Grid**:

   **a) Revenue Trend Chart** (Line Chart):
   - X-axis: Time (days/weeks/months)
   - Y-axis: Revenue
   - Multiple lines: Current period, Previous period (if comparison enabled)
   - Hover tooltips with exact values

   **b) Sales by Category** (Pie/Donut Chart):
   - Each slice = category
   - Hover shows percentage and revenue
   - Legend with category names

   **c) Top Selling Products** (Horizontal Bar Chart):
   - Top 10 products
   - Bar length = revenue
   - Color-coded by category

   **d) Orders by Hour** (Bar Chart):
   - X-axis: Hours (0-23)
   - Y-axis: Order count
   - Identify peak hours

   **e) Customer Acquisition** (Stacked Area Chart):
   - New customers vs Returning customers over time
   - Different colors for each segment

   **f) Payment Methods Distribution** (Pie Chart):
   - Cash on Delivery, Card, Wallet
   - Percentage and total amount

4. **Data Tables**:

   **Top Products Table**:
   - Product Name (with image)
   - Category
   - Units Sold
   - Revenue
   - Growth %

   **Top Categories Table**:
   - Category Name
   - Revenue
   - Orders Count
   - % of Total Revenue

5. **Export Actions**:
   - Export Analytics Report (PDF)
   - Export Data (CSV/Excel)
   - Schedule Email Report

### 11.3.2 Product Performance Page

**Route**: `/admin/analytics/products`

**Components**:

- **Filters**:
  - Category filter
  - Performance filter (Best/Worst/All)
  - Date range

- **Performance Matrix**:
  - 2x2 grid: High Revenue/High Growth, High Revenue/Low Growth, Low Revenue/High Growth, Low Revenue/Low Growth
  - Products plotted on scatter chart

- **Data Table**:
  - Product Name
  - Category
  - Units Sold
  - Revenue
  - Profit
  - Profit Margin %
  - Growth Rate %
  - Stock Status

- **Insights Panel**:
  - Products to restock urgently
  - Products to promote (high margin, low sales)
  - Products to discount (low margin, low sales)

### 11.4 Frontend Implementation Example

```typescript
// pages/admin/analytics/index.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, format } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsApi } from '@/services/api/analyticsApi';

export default function AnalyticsDashboardPage() {
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [comparePrevious, setComparePrevious] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['sales-analytics', dateRange, comparePrevious],
    queryFn: () =>
      analyticsApi.getSalesAnalytics({
        date_from: dateRange.from,
        date_to: dateRange.to,
        compare_previous: comparePrevious,
      }),
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => exportReport('csv')}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-4 items-center">
          <QuickFilters onSelect={(range) => setDateRange(range)} />
          <DateRangePicker
            from={dateRange.from}
            to={dateRange.to}
            onChange={setDateRange}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={comparePrevious}
              onChange={(e) => setComparePrevious(e.target.checked)}
            />
            <span className="text-sm">Compare with previous period</span>
          </label>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Total Revenue"
          value={`${data?.summary.total_revenue} EGP`}
          change={data?.comparison?.revenue_change}
          trend={data?.comparison?.revenue_change > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Total Orders"
          value={data?.summary.total_orders}
          change={data?.comparison?.orders_change}
        />
        <MetricCard
          title="Avg Order Value"
          value={`${data?.summary.average_order_value} EGP`}
          change={data?.comparison?.aov_change}
        />
        <MetricCard
          title="Unique Customers"
          value={data?.summary.unique_customers}
          subtitle={`${data?.summary.returning_customers} returning`}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data?.time_series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#8884d8"
                strokeWidth={2}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Category Pie Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data?.top_categories}
                dataKey="revenue"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label={(entry) => `${entry.name}: ${entry.percentage_of_total}%`}
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by Hour */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4">Orders by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.hourly_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders_count" fill="#82ca9d" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4">Top Selling Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data?.top_selling_products}
              layout="horizontal"
              margin={{ left: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4">Top Products</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Units Sold</th>
                <th className="text-right py-2">Revenue</th>
                <th className="text-right py-2">Growth</th>
              </tr>
            </thead>
            <tbody>
              {data?.top_selling_products.map((product) => (
                <tr key={product.product_id} className="border-b">
                  <td className="py-2">{product.name}</td>
                  <td className="text-right">{product.units_sold}</td>
                  <td className="text-right">{product.revenue} EGP</td>
                  <td className="text-right">
                    <span
                      className={
                        product.growth_percentage > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {product.growth_percentage > 0 ? '+' : ''}
                      {product.growth_percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Categories Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4">Top Categories</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Orders</th>
                <th className="text-right py-2">Revenue</th>
                <th className="text-right py-2">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {data?.top_categories.map((category) => (
                <tr key={category.category_id} className="border-b">
                  <td className="py-2">{category.name}</td>
                  <td className="text-right">{category.orders_count}</td>
                  <td className="text-right">{category.revenue} EGP</td>
                  <td className="text-right">{category.percentage_of_total}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## 12. FRONTEND ARCHITECTURE & DESIGN PATTERNS

### 12.1 Recommended Tech Stack

**Core Framework**: React 18+ with TypeScript 5+

**Reasons**:
- Component reusability across modules
- Strong typing for API contracts
- Excellent ecosystem for admin dashboards
- Great developer experience
- Compatible with Lovable code generation

**State Management**: TanStack Query (React Query) v5

**Reasons**:
- Server state management (API data caching)
- Automatic refetching and invalidation
- Loading/error states handled automatically
- Optimistic updates for better UX
- No need for Redux/Zustand for API data

**UI Component Library**: shadcn/ui + Radix UI

**Reasons**:
- Copy-paste components (no npm bloat)
- Fully customizable with Tailwind
- Accessible by default (ARIA compliant)
- Modern, professional design
- Perfect for enterprise dashboards

**Styling**: Tailwind CSS 3+

**Reasons**:
- Utility-first approach (faster development)
- Consistent design system
- Dark mode support
- Responsive design made easy
- Small production bundle

**Charts**: Recharts or Chart.js

**Reasons**:
- React-native integration
- Customizable and beautiful
- Supports all chart types needed
- Good documentation

**Tables**: TanStack Table (React Table) v8

**Reasons**:
- Headless UI (full control over markup)
- Sorting, filtering, pagination built-in
- Virtual scrolling for large datasets
- TypeScript support

**Forms**: React Hook Form + Zod

**Reasons**:
- Minimal re-renders (performance)
- TypeScript schema validation with Zod
- Easy integration with API contracts
- Great DX

**Routing**: React Router v6

**Reasons**:
- Standard for React SPAs
- Nested routes for module organization
- Code splitting support

**Build Tool**: Vite

**Reasons**:
- Lightning-fast HMR
- Modern build optimization
- Better than Create React App
- Native ESM support

### 12.2 Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── assets/
│       └── images/
├── src/
│   ├── main.tsx                    # App entry point
│   ├── App.tsx                     # Root component
│   ├── routes/                     # Route definitions
│   │   ├── index.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── RoleBasedRoute.tsx
│   ├── pages/                      # Page components (route containers)
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── ForgotPasswordPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── products/
│   │   │   ├── ProductListPage.tsx
│   │   │   ├── ProductCreatePage.tsx
│   │   │   └── ProductEditPage.tsx
│   │   ├── categories/
│   │   │   └── CategoryManagementPage.tsx
│   │   ├── orders/
│   │   │   ├── OrderListPage.tsx
│   │   │   └── OrderDetailPage.tsx
│   │   ├── support/
│   │   │   ├── TicketListPage.tsx
│   │   │   └── TicketDetailPage.tsx
│   │   ├── financial/
│   │   │   ├── FinancialDashboardPage.tsx
│   │   │   └── TransactionsPage.tsx
│   │   ├── users/
│   │   │   └── AdminUsersPage.tsx
│   │   └── analytics/
│   │       ├── AnalyticsDashboardPage.tsx
│   │       └── ProductPerformancePage.tsx
│   ├── components/                 # Reusable components
│   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Badge.tsx
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        # Main layout wrapper
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── products/
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── ProductFilters.tsx
│   │   ├── categories/
│   │   │   ├── CategoryTree.tsx
│   │   │   └── CategoryDragDrop.tsx
│   │   ├── orders/
│   │   │   ├── OrderStatusBadge.tsx
│   │   │   ├── OrderTimeline.tsx
│   │   │   └── OrderItemsTable.tsx
│   │   ├── support/
│   │   │   ├── MessageThread.tsx
│   │   │   ├── ReplyBox.tsx
│   │   │   └── TicketFilters.tsx
│   │   ├── financial/
│   │   │   ├── RevenueChart.tsx
│   │   │   ├── PaymentMethodPieChart.tsx
│   │   │   └── RefundModal.tsx
│   │   └── analytics/
│   │       ├── MetricCard.tsx
│   │       └── ChartContainer.tsx
│   ├── services/                   # API clients
│   │   ├── api/
│   │   │   ├── apiClient.ts        # Axios instance
│   │   │   ├── authApi.ts
│   │   │   ├── productsApi.ts
│   │   │   ├── categoriesApi.ts
│   │   │   ├── ordersApi.ts
│   │   │   ├── supportApi.ts
│   │   │   ├── financialApi.ts
│   │   │   ├── userManagementApi.ts
│   │   │   └── analyticsApi.ts
│   │   └── websocket/
│   │       └── notificationService.ts
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── usePermissions.ts
│   │   ├── useDebounce.ts
│   │   ├── usePagination.ts
│   │   └── useFilters.ts
│   ├── stores/                     # Global state (Zustand)
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── types/                      # TypeScript types
│   │   ├── api.types.ts
│   │   ├── product.types.ts
│   │   ├── order.types.ts
│   │   ├── user.types.ts
│   │   └── index.ts
│   ├── utils/                      # Utility functions
│   │   ├── formatters.ts           # Date, currency, etc.
│   │   ├── validators.ts
│   │   ├── permissions.ts
│   │   └── constants.ts
│   └── styles/
│       └── globals.css             # Tailwind imports
├── .env.example
├── .env.development
├── .env.production
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### 12.3 Authentication Flow

```typescript
// services/api/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'sales_manager' | 'accountant' | 'customer_support';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: async (email, password) => {
        const response = await authApi.login({ email, password });
        const { user, token } = response.data;
        
        localStorage.setItem('auth_token', token);
        set({ user, token, isAuthenticated: true });
      },
      
      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

```typescript
// routes/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
}
```

```typescript
// routes/RoleBasedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface RoleBasedRouteProps {
  allowedRoles: string[];
}

export function RoleBasedRoute({ allowedRoles }: RoleBasedRouteProps) {
  const user = useAuthStore((state) => state.user);
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <Outlet />;
}
```

### 12.4 Permission Checking

```typescript
// utils/permissions.ts
export const PERMISSIONS = {
  PRODUCTS: {
    VIEW: ['super_admin', 'admin', 'sales_manager'],
    CREATE: ['super_admin', 'admin', 'sales_manager'],
    EDIT: ['super_admin', 'admin', 'sales_manager'],
    DELETE: ['super_admin', 'admin'],
  },
  ORDERS: {
    VIEW: ['super_admin', 'admin', 'sales_manager', 'accountant', 'customer_support'],
    EDIT: ['super_admin', 'admin', 'sales_manager'],
    CANCEL: ['super_admin', 'admin', 'sales_manager'],
  },
  FINANCIAL: {
    VIEW: ['super_admin', 'admin', 'sales_manager', 'accountant'],
    REFUND: ['super_admin', 'admin', 'accountant'],
    EXPORT: ['super_admin', 'admin', 'accountant'],
  },
  USERS: {
    VIEW: ['super_admin', 'admin'],
    CREATE: ['super_admin', 'admin'],
    EDIT: ['super_admin', 'admin'],
    DELETE: ['super_admin'],
  },
} as const;

export function hasPermission(userRole: string, permission: string[]): boolean {
  return permission.includes(userRole);
}
```

```typescript
// hooks/usePermissions.ts
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/utils/permissions';

export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  
  const can = (permission: string[]) => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };
  
  return { can };
}
```

**Usage in Components**:

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/utils/permissions';

export function ProductActions() {
  const { can } = usePermissions();
  
  return (
    <div>
      {can(PERMISSIONS.PRODUCTS.EDIT) && (
        <Button onClick={editProduct}>Edit</Button>
      )}
      {can(PERMISSIONS.PRODUCTS.DELETE) && (
        <Button onClick={deleteProduct}>Delete</Button>
      )}
    </div>
  );
}
```

---

## 13. BACKEND ARCHITECTURE & DESIGN PATTERNS

### 13.1 Laravel Project Structure

```
backend/
├── app/
│   ├── Console/
│   │   └── Commands/               # Artisan commands
│   ├── Exceptions/
│   │   └── Handler.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Admin/              # Admin-specific controllers
│   │   │   │   ├── ProductController.php
│   │   │   │   ├── CategoryController.php
│   │   │   │   ├── OrderController.php
│   │   │   │   ├── SupportController.php
│   │   │   │   ├── FinancialController.php
│   │   │   │   ├── UserManagementController.php
│   │   │   │   └── AnalyticsController.php
│   │   │   └── Auth/
│   │   │       └── AdminAuthController.php
│   │   ├── Middleware/
│   │   │   ├── Authenticate.php
│   │   │   ├── CheckRole.php
│   │   │   └── LogActivity.php
│   │   ├── Requests/              # Form request validation
│   │   │   ├── ProductStoreRequest.php
│   │   │   ├── ProductUpdateRequest.php
│   │   │   └── OrderUpdateRequest.php
│   │   └── Resources/             # API resources (transformers)
│   │       ├── ProductResource.php
│   │       ├── OrderResource.php
│   │       └── UserResource.php
│   ├── Models/
│   │   ├── User.php
│   │   ├── Product.php
│   │   ├── Category.php
│   │   ├── Order.php
│   │   ├── OrderItem.php
│   │   ├── Complaint.php
│   │   └── PaymentTransaction.php
│   ├── Services/                  # Business logic layer
│   │   ├── ProductService.php
│   │   ├── OrderService.php
│   │   ├── PaymentService.php
│   │   └── NotificationService.php
│   ├── Repositories/              # Data access layer (optional)
│   │   ├── ProductRepository.php
│   │   └── OrderRepository.php
│   └── Traits/
│       └── HasPermissions.php
├── bootstrap/
├── config/
│   ├── app.php
│   ├── auth.php
│   ├── cors.php
│   ├── database.php
│   └── sanctum.php
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── factories/
├── routes/
│   ├── api.php                    # API routes
│   └── web.php
├── storage/
│   └── app/
│       ├── public/
│       └── private/
├── tests/
│   ├── Feature/
│   └── Unit/
├── .env
├── .env.example
├── artisan
└── composer.json
```

### 13.2 Service Layer Pattern

```php
// app/Services/ProductService.php
namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class ProductService
{
    public function createProduct(array $data): Product
    {
        return DB::transaction(function() use ($data) {
            $product = Product::create([
                'barcode' => $data['barcode'],
                'name' => $data['name'],
                'name_ar' => $data['name_ar'],
                'price' => $data['price'],
                'cost_price' => $data['cost_price'],
                'stock_quantity' => $data['stock_quantity'],
                'category_id' => $data['category_id'],
                'description' => $data['description'] ?? null,
                'description_ar' => $data['description_ar'] ?? null,
                'image' => $data['image'] ?? null,
                'is_available' => $data['is_available'] ?? true,
            ]);
            
            // Sync categories if multiple
            if (isset($data['category_ids'])) {
                $product->categories()->sync($data['category_ids']);
            }
            
            // Clear cache
            Cache::tags(['products'])->flush();
            
            // Log activity
            activity()
                ->performedOn($product)
                ->causedBy(auth()->user())
                ->log('product_created');
            
            return $product;
        });
    }
    
    public function updateProduct(Product $product, array $data): Product
    {
        return DB::transaction(function() use ($product, $data) {
            $oldData = $product->toArray();
            
            $product->update($data);
            
            if (isset($data['category_ids'])) {
                $product->categories()->sync($data['category_ids']);
            }
            
            // Clear cache
            Cache::tags(['products'])->flush();
            
            // Log activity with changes
            activity()
                ->performedOn($product)
                ->causedBy(auth()->user())
                ->withProperties([
                    'old' => $oldData,
                    'new' => $product->fresh()->toArray(),
                ])
                ->log('product_updated');
            
            return $product->fresh();
        });
    }
    
    public function deleteProduct(Product $product): bool
    {
        return DB::transaction(function() use ($product) {
            // Check if product is in pending/active orders
            $hasActiveOrders = $product->orderItems()
                ->whereHas('order', function($query) {
                    $query->whereIn('status', ['pending', 'confirmed', 'preparing', 'out_for_delivery']);
                })
                ->exists();
            
            if ($hasActiveOrders) {
                throw new \Exception('Cannot delete product with active orders');
            }
            
            // Log before deletion
            activity()
                ->performedOn($product)
                ->causedBy(auth()->user())
                ->withProperties($product->toArray())
                ->log('product_deleted');
            
            // Clear cache
            Cache::tags(['products'])->flush();
            
            return $product->delete();
        });
    }
}
```

**Using Service in Controller**:

```php
// app/Http/Controllers/Admin/ProductController.php
namespace App\Http\Controllers\Admin;

use App\Services\ProductService;
use App\Http\Requests\ProductStoreRequest;
use App\Http\Requests\ProductUpdateRequest;
use App\Http\Resources\ProductResource;

class ProductController extends Controller
{
    protected $productService;
    
    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }
    
    public function store(ProductStoreRequest $request)
    {
        try {
            $product = $this->productService->createProduct($request->validated());
            
            return response()->json([
                'message' => 'Product created successfully',
                'data' => new ProductResource($product),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create product',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    
    public function update(ProductUpdateRequest $request, $barcode)
    {
        $product = Product::where('barcode', $barcode)->firstOrFail();
        
        try {
            $product = $this->productService->updateProduct($product, $request->validated());
            
            return response()->json([
                'message' => 'Product updated successfully',
                'data' => new ProductResource($product),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update product',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
```

### 13.3 API Resource Transformers

```php
// app/Http/Resources/ProductResource.php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'barcode' => $this->barcode,
            'name' => $this->name,
            'name_ar' => $this->name_ar,
            'price' => number_format($this->price, 2),
            'cost_price' => number_format($this->cost_price, 2),
            'stock_quantity' => $this->stock_quantity,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'description' => $this->description,
            'description_ar' => $this->description_ar,
            'image' => $this->image ? asset('storage/' . $this->image) : null,
            'is_available' => $this->is_available,
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
```

### 13.4 Middleware for Role-Based Access

```php
// app/Http/Middleware/CheckRole.php
namespace App\Http\Middleware;

use Closure;

class CheckRole
{
    public function handle($request, Closure $next, ...$roles)
    {
        if (!auth()->check()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        
        $userRole = auth()->user()->role;
        
        if (!in_array($userRole, $roles)) {
            return response()->json([
                'message' => 'Unauthorized. Required roles: ' . implode(', ', $roles)
            ], 403);
        }
        
        return $next($request);
    }
}
```

**Register in** `app/Http/Kernel.php`:

```php
protected $middlewareAliases = [
    'role' => \App\Http\Middleware\CheckRole::class,
];
```

**Usage in Routes**:

```php
// routes/api.php
Route::middleware(['auth:sanctum', 'role:super_admin,admin'])->group(function() {
    Route::post('/admin/products', [ProductController::class, 'store']);
    Route::put('/admin/products/{barcode}', [ProductController::class, 'update']);
});

Route::middleware(['auth:sanctum', 'role:super_admin'])->group(function() {
    Route::delete('/admin/products/{barcode}', [ProductController::class, 'destroy']);
});
```

### 13.5 Caching Strategy

```php
// Example: Cache product list with auto-invalidation
public function index(Request $request)
{
    $cacheKey = 'products:list:' . md5(json_encode($request->all()));
    
    $products = Cache::tags(['products'])->remember($cacheKey, 600, function() use ($request) {
        return Product::with('category')
            ->when($request->search, function($query, $search) {
                $query->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('barcode', 'LIKE', "%{$search}%");
            })
            ->when($request->category_id, function($query, $categoryId) {
                $query->where('category_id', $categoryId);
            })
            ->paginate($request->per_page ?? 20);
    });
    
    return ProductResource::collection($products);
}

// Invalidate cache when product is created/updated/deleted
Cache::tags(['products'])->flush();
```

---

## 14. SECURITY IMPLEMENTATION GUIDE

### 14.1 Authentication Security

**Laravel Sanctum Configuration**:

```php
// config/sanctum.php
'expiration' => 525600, // 1 year for mobile apps (in minutes)
'token_prefix' => 'elbaraka_',

'middleware' => [
    'verify_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
    'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
],
```

**Rate Limiting**:

```php
// app/Providers/RouteServiceProvider.php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

protected function configureRateLimiting()
{
    // Admin login: 5 attempts per minute
    RateLimiter::for('admin-login', function (Request $request) {
        return Limit::perMinute(5)->by($request->ip());
    });
    
    // API requests: 60 per minute
    RateLimiter::for('api', function (Request $request) {
        return $request->user()
            ? Limit::perMinute(60)->by($request->user()->id)
            : Limit::perMinute(20)->by($request->ip());
    });
}
```

**Apply Rate Limiting**:

```php
// routes/api.php
Route::post('/admin/login', [AdminAuthController::class, 'login'])
    ->middleware('throttle:admin-login');

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function() {
    // All admin routes
});
```

### 14.2 Input Validation & Sanitization

**Form Request Example**:

```php
// app/Http/Requests/ProductStoreRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductStoreRequest extends FormRequest
{
    public function authorize()
    {
        return auth()->check() && in_array(auth()->user()->role, ['super_admin', 'admin', 'sales_manager']);
    }
    
    public function rules()
    {
        return [
            'barcode' => 'required|numeric|digits:13|unique:products,barcode',
            'name' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'price' => 'required|numeric|min:0|max:999999.99',
            'cost_price' => 'required|numeric|min:0|max:999999.99|lt:price',
            'stock_quantity' => 'required|integer|min:0',
            'category_id' => 'required|exists:categories,id',
            'description' => 'nullable|string|max:1000',
            'description_ar' => 'nullable|string|max:1000',
            'image' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:2048',
            'is_available' => 'boolean',
        ];
    }
    
    public function messages()
    {
        return [
            'barcode.required' => 'Product barcode is required',
            'barcode.digits' => 'Barcode must be exactly 13 digits',
            'barcode.unique' => 'This barcode already exists in the system',
            'price.min' => 'Price must be greater than 0',
            'cost_price.lt' => 'Cost price must be less than selling price',
        ];
    }
    
    protected function prepareForValidation()
    {
        // Sanitize inputs
        $this->merge([
            'name' => strip_tags($this->name),
            'description' => strip_tags($this->description),
        ]);
    }
}
```

### 14.3 SQL Injection Prevention

**Always use Eloquent ORM or Query Builder** (automatic parameter binding):

```php
// ✅ SAFE: Using Eloquent
$products = Product::where('category_id', $request->category_id)->get();

// ✅ SAFE: Using Query Builder with bindings
$products = DB::table('products')
    ->where('price', '>=', $request->min_price)
    ->get();

// ❌ NEVER DO THIS: Raw SQL with concatenation
$products = DB::select("SELECT * FROM products WHERE name = '" . $request->name . "'");

// ✅ If raw SQL is necessary, use parameter binding
$products = DB::select("SELECT * FROM products WHERE name = ?", [$request->name]);
```

### 14.4 XSS Prevention

**Frontend (React)**:
- React automatically escapes JSX expressions
- Never use `dangerouslySetInnerHTML` unless absolutely necessary
- If needed, use DOMPurify library

```typescript
import DOMPurify from 'dompurify';

function SafeHTML({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

**Backend (Laravel)**:
- Use `{{ $variable }}` in Blade (auto-escapes)
- Use `{!! $variable !!}` ONLY for trusted HTML
- Strip tags in form requests

### 14.5 CORS Configuration

```php
// config/cors.php
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:5173'), // Vite dev server
        'https://admin.elbaraka.com',  // Production frontend
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

### 14.6 File Upload Security

```php
public function uploadProductImage(Request $request)
{
    $request->validate([
        'image' => 'required|image|mimes:jpeg,jpg,png,webp|max:2048', // 2MB max
    ]);
    
    // Generate unique filename
    $filename = uniqid() . '_' . time() . '.' . $request->file('image')->extension();
    
    // Store in private storage (not publicly accessible)
    $path = $request->file('image')->storeAs('products', $filename, 'private');
    
    return $path;
}

// To serve the image securely
public function getImage($filename)
{
    $path = storage_path('app/private/products/' . $filename);
    
    if (!File::exists($path)) {
        abort(404);
    }
    
    // Check user has permission to view
    if (!auth()->check()) {
        abort(403);
    }
    
    $file = File::get($path);
    $type = File::mimeType($path);
    
    return response($file, 200)->header('Content-Type', $type);
}
```

### 14.7 Activity Logging

**Using spatie/laravel-activitylog**:

```bash
composer require spatie/laravel-activitylog
php artisan vendor:publish --provider="Spatie\Activitylog\ActivitylogServiceProvider"
php artisan migrate
```

```php
// Log in service layer
activity()
    ->performedOn($product)
    ->causedBy(auth()->user())
    ->withProperties([
        'old' => $oldData,
        'new' => $newData,
    ])
    ->log('product_updated');

// Retrieve logs
$activities = Activity::where('subject_type', 'App\Models\Product')
    ->where('subject_id', $productId)
    ->get();
```

---

## 15. DEPLOYMENT & DEVOPS GUIDE

### 15.1 Server Requirements

**Backend (Laravel)**:
- PHP 8.2+
- MySQL 8.0+ or MariaDB 10.6+
- Redis 6.2+ (for caching and queues)
- Composer 2.x
- Nginx or Apache
- SSL certificate (Let's Encrypt recommended)

**Frontend (React)**:
- Node.js 18+ (for build process)
- Static file server (Nginx, Apache, or CDN)

**Recommended Server Setup**:
- Ubuntu 22.04 LTS
- 4GB RAM minimum (8GB recommended)
- 50GB SSD storage minimum
- 2 CPU cores minimum (4 recommended)

### 15.2 Environment Configuration

**Backend** `.env` (Production):

```env
APP_NAME="ElBaraka Admin"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.elbaraka.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=elbaraka_production
DB_USERNAME=elbaraka_user
DB_PASSWORD=STRONG_PASSWORD_HERE

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=REDIS_PASSWORD_HERE
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls

SANCTUM_STATEFUL_DOMAINS=admin.elbaraka.com
FRONTEND_URL=https://admin.elbaraka.com

PAYMOB_API_KEY=your_paymob_api_key
PAYMOB_INTEGRATION_ID_CARD=your_card_integration_id
PAYMOB_INTEGRATION_ID_WALLET=your_wallet_integration_id
PAYMOB_HMAC_SECRET=your_hmac_secret
```

**Frontend** `.env.production`:

```env
VITE_API_BASE_URL=https://api.elbaraka.com/api/v1
VITE_APP_NAME=ElBaraka Admin Dashboard
VITE_ENABLE_ANALYTICS=true
```

### 15.3 Nginx Configuration

**Backend (Laravel API)**:

```nginx
# /etc/nginx/sites-available/elbaraka-api
server {
    listen 80;
    server_name api.elbaraka.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.elbaraka.com;
    root /var/www/elbaraka/backend/public;

    index index.php;

    ssl_certificate /etc/letsencrypt/live/api.elbaraka.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.elbaraka.com/privkey.pem;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    client_max_body_size 10M;
}
```

**Frontend (React SPA)**:

```nginx
# /etc/nginx/sites-available/elbaraka-admin
server {
    listen 80;
    server_name admin.elbaraka.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.elbaraka.com;
    root /var/www/elbaraka/frontend/dist;

    index index.html;

    ssl_certificate /etc/letsencrypt/live/admin.elbaraka.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.elbaraka.com/privkey.pem;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### 15.4 Deployment Script

**Backend Deployment**:

```bash
#!/bin/bash
# deploy-backend.sh

echo "Starting backend deployment..."

cd /var/www/elbaraka/backend

# Pull latest code
git pull origin main

# Install dependencies
composer install --no-dev --optimize-autoloader

# Run migrations
php artisan migrate --force

# Clear and cache config
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart services
sudo systemctl restart php8.2-fpm
sudo systemctl restart nginx
sudo supervisorctl restart elbaraka-worker:*

echo "Backend deployment complete!"
```

**Frontend Deployment**:

```bash
#!/bin/bash
# deploy-frontend.sh

echo "Starting frontend deployment..."

cd /var/www/elbaraka/frontend

# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build production bundle
npm run build

# Restart Nginx
sudo systemctl restart nginx

echo "Frontend deployment complete!"
```

### 15.5 Queue Worker Setup (Supervisor)

```ini
# /etc/supervisor/conf.d/elbaraka-worker.conf
[program:elbaraka-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/elbaraka/backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/elbaraka/backend/storage/logs/worker.log
stopwaitsecs=3600
```

### 15.6 Database Backup

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backups/elbaraka"
DATE=$(date +%Y-%m-%d-%H%M%S)
DB_NAME="elbaraka_production"
DB_USER="elbaraka_user"
DB_PASS="YOUR_PASSWORD"

mkdir -p $BACKUP_DIR

# Create backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/db-backup-$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -name "db-backup-*.sql.gz" -mtime +7 -delete

echo "Database backup completed: db-backup-$DATE.sql.gz"
```

**Add to crontab**:

```bash
# Run backup daily at 2 AM
0 2 * * * /var/www/elbaraka/scripts/backup-database.sh
```

---

## 16. TESTING STRATEGY

### 16.1 Backend Testing (Laravel)

**Feature Test Example**:

```php
// tests/Feature/ProductManagementTest.php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProductManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_product()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        
        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/admin/products', [
                'barcode' => '6221234567890',
                'name' => 'Test Product',
                'name_ar' => 'منتج تجريبي',
                'price' => 25.00,
                'cost_price' => 15.00,
                'stock_quantity' => 100,
                'category_id' => 1,
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'data' => ['barcode', 'name', 'price'],
            ]);

        $this->assertDatabaseHas('products', [
            'barcode' => '6221234567890',
            'name' => 'Test Product',
        ]);
    }

    public function test_sales_manager_cannot_delete_product()
    {
        $salesManager = User::factory()->create(['role' => 'sales_manager']);
        $product = Product::factory()->create();
        
        $response = $this->actingAs($salesManager, 'sanctum')
            ->deleteJson("/api/v1/admin/products/{$product->barcode}");

        $response->assertStatus(403);
    }
}
```

**Run Tests**:

```bash
php artisan test
php artisan test --filter=ProductManagementTest
php artisan test --coverage  # Requires Xdebug
```

### 16.2 Frontend Testing (React)

**Component Test Example** (using Vitest + React Testing Library):

```typescript
// components/products/ProductForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductForm } from './ProductForm';

const queryClient = new QueryClient();

describe('ProductForm', () => {
  it('should render all form fields', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductForm />
      </QueryClientProvider>
    );

    expect(screen.getByLabelText(/barcode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
  });

  it('should show validation errors for invalid barcode', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductForm />
      </QueryClientProvider>
    );

    const barcodeInput = screen.getByLabelText(/barcode/i);
    fireEvent.change(barcodeInput, { target: { value: '123' } });
    fireEvent.blur(barcodeInput);

    await waitFor(() => {
      expect(screen.getByText(/barcode must be 13 digits/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const mockOnSubmit = vi.fn();
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProductForm onSubmit={mockOnSubmit} />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText(/barcode/i), {
      target: { value: '6221234567890' },
    });
    fireEvent.change(screen.getByLabelText(/product name/i), {
      target: { value: 'Test Product' },
    });
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: '25.00' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        barcode: '6221234567890',
        name: 'Test Product',
        price: 25.00,
      });
    });
  });
});
```

**Run Tests**:

```bash
npm test
npm run test:coverage
```

---

## 17. LOVABLE INTEGRATION GUIDE

### 17.1 What is Lovable?

Lovable is an AI-powered frontend code generation platform that can generate React/Vue components from markdown specifications. This documentation is specifically formatted to be compatible with Lovable's generation engine.

### 17.2 How to Use This Documentation with Lovable

**Step 1**: Upload this documentation to Lovable

**Step 2**: Generate components module by module:

```markdown
Generate Product Management module components:
- ProductListPage with filtering and pagination
- ProductForm for create/edit
- ProductCard component
- API service for products

Use the Product Management section specifications.
```

**Step 3**: Customize generated code:

- Review generated components
- Adjust styling to match ElBaraka brand colors
- Connect to actual API endpoints
- Add error handling

**Step 4**: Integrate with backend:

```typescript
// Update API base URL
const apiClient = axios.create({
  baseURL: 'https://api.elbaraka.com/api/v1',
});
```

### 17.3 Component Generation Prompts

**For Product Management**:

```
Create a complete Product Management module with:

1. ProductListPage:
   - Data table with columns: barcode, name, category, price, stock, status
   - Filters: search, category, availability
   - Pagination
   - Actions: edit, delete, view details
   - "Add Product" button

2. ProductForm:
   - Fields: barcode (13 digits), name, name_ar, price, cost_price, stock_quantity, category_id, description, description_ar, image upload
   - Validation using Zod
   - Submit to POST /api/v1/admin/products
   - Error handling

3. API Service:
   - getProducts(filters)
   - createProduct(data)
   - updateProduct(barcode, data)
   - deleteProduct(barcode)

Use TypeScript, React Hook Form, TanStack Query, shadcn/ui components.
```

**For Order Management**:

```
Create Order Management module with:

1. OrderListPage:
   - Data table: order number, customer, total, status, payment status, date
   - Status badges (color-coded for each status)
   - Filters: status, payment status, date range
   - Search by order number or customer name

2. OrderDetailPage:
   - Order information card
   - Customer details card
   - Items table
   - Order timeline
   - Update status modal
   - Cancel order button

3. API Service:
   - getOrders(filters)
   - getOrder(id)
   - updateOrderStatus(id, status)
   - cancelOrder(id)

Use TypeScript, TanStack Query, shadcn/ui.
```

### 17.4 Generated Code Customization

**ElBaraka Brand Colors** (add to `tailwind.config.js`):

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'elbaraka-primary': '#2D5A3D',      // Deep Green
        'elbaraka-secondary': '#4A7C59',    // Medium Green
        'elbaraka-accent': '#F4A259',       // Warm Orange
        'elbaraka-bg': '#F7F9F7',           // Light Mint
        'elbaraka-text': '#2C3E3A',         // Dark Green-Gray
      },
    },
  },
};
```

**Apply to Components**:

```typescript
// Update button variants
<Button className="bg-elbaraka-primary hover:bg-elbaraka-secondary">
  Add Product
</Button>

// Status badges
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};
```

---

## 18. APPENDIX

### 18.1 Complete API Endpoints Reference

**Authentication**:
- `POST /api/v1/admin/login` - Admin login
- `POST /api/v1/admin/logout` - Logout
- `POST /api/v1/admin/refresh` - Refresh token

**Products**:
- `GET /api/v1/admin/products` - List products
- `POST /api/v1/admin/products` - Create product
- `GET /api/v1/admin/products/{barcode}` - Get product
- `PUT /api/v1/admin/products/{barcode}` - Update product
- `DELETE /api/v1/admin/products/{barcode}` - Delete product
- `POST /api/v1/admin/products/{barcode}/upload-image` - Upload image

**Categories**:
- `GET /api/v1/admin/categories` - List categories
- `GET /api/v1/admin/categories/tree` - Category tree
- `POST /api/v1/admin/categories` - Create category
- `PUT /api/v1/admin/categories/{id}` - Update category
- `DELETE /api/v1/admin/categories/{id}` - Delete category
- `POST /api/v1/admin/categories/reorder` - Reorder categories

**Orders**:
- `GET /api/v1/admin/orders` - List orders
- `GET /api/v1/admin/orders/{id}` - Get order details
- `PUT /api/v1/admin/orders/{id}/status` - Update status
- `POST /api/v1/admin/orders/{id}/cancel` - Cancel order

**Support**:
- `GET /api/v1/admin/support/tickets` - List tickets
- `GET /api/v1/admin/support/tickets/{id}` - Get ticket
- `POST /api/v1/admin/support/tickets/{id}/reply` - Reply to ticket
- `POST /api/v1/admin/support/tickets/{id}/assign` - Assign ticket
- `POST /api/v1/admin/support/tickets/{id}/close` - Close ticket

**Financial**:
- `GET /api/v1/admin/financial/dashboard` - Financial dashboard
- `GET /api/v1/admin/financial/transactions` - List transactions
- `POST /api/v1/admin/financial/transactions/{id}/refund` - Process refund
- `GET /api/v1/admin/financial/promo-codes/analytics` - Promo analytics
- `GET /api/v1/admin/financial/export` - Export report

**User Management**:
- `GET /api/v1/admin/users` - List admin users
- `POST /api/v1/admin/users` - Create admin user
- `PUT /api/v1/admin/users/{id}` - Update admin user
- `DELETE /api/v1/admin/users/{id}` - Delete admin user
- `POST /api/v1/admin/users/{id}/enable-2fa` - Enable 2FA

**Analytics**:
- `GET /api/v1/admin/analytics/sales` - Sales analytics
- `GET /api/v1/admin/analytics/products` - Product performance
- `GET /api/v1/admin/analytics/customers` - Customer analytics

### 18.2 Database Schema Summary

**Total Tables**: 26

**Core Tables**:
- users (customers + admin users)
- products (barcode as PK)
- categories (hierarchical with parent_id)
- orders (7-status lifecycle)
- order_items (product snapshots)
- complaints (support tickets)
- complaint_messages (ticket conversations)
- payment_transactions (all payments)
- paymob_payments (Paymob-specific)
- promo_codes (discount codes)
- promo_code_usage (usage tracking)
- activity_log (audit trail)

**Relationships**:
- User → Orders (1:N)
- Order → OrderItems (1:N)
- Product → OrderItems (1:N)
- Category → Products (1:N)
- Category → Category (parent-child, self-referencing)
- User → Complaints (1:N)
- Complaint → ComplaintMessages (1:N)
- Order → PaymentTransactions (1:1)

### 18.3 Quick Start Checklist

**Backend Setup**:
- [ ] Clone repository
- [ ] Run `composer install`
- [ ] Copy `.env.example` to `.env`
- [ ] Generate app key: `php artisan key:generate`
- [ ] Configure database in `.env`
- [ ] Run migrations: `php artisan migrate`
- [ ] Seed data: `php artisan db:seed`
- [ ] Start server: `php artisan serve`

**Frontend Setup**:
- [ ] Navigate to frontend directory
- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env`
- [ ] Update API URL in `.env`
- [ ] Start dev server: `npm run dev`
- [ ] Build for production: `npm run build`

**First Login**:
- Default admin: admin@elbaraka.com
- Default password: (from seeder)

### 18.4 Troubleshooting Guide

**Issue**: 401 Unauthorized on API requests

**Solution**:
- Check token in localStorage
- Verify token not expired (1-year expiration)
- Check CORS configuration
- Verify `Authorization: Bearer {token}` header

**Issue**: Products not showing images

**Solution**:
- Run `php artisan storage:link`
- Check file permissions on `storage/app/public`
- Verify image path in database

**Issue**: Orders stuck in "pending" status

**Solution**:
- Check queue worker is running
- Verify Redis connection
- Check Laravel logs: `storage/logs/laravel.log`

**Issue**: Permission denied errors

**Solution**:
- Verify user role in database
- Check middleware configuration
- Review permission matrix in documentation

### 18.5 Performance Optimization Tips

**Backend**:
- Enable OPcache in PHP
- Use Redis for caching and sessions
- Index database columns used in WHERE clauses
- Use eager loading (`with()`) to prevent N+1 queries
- Implement API response caching
- Use queue workers for async tasks

**Frontend**:
- Code splitting per route
- Lazy load images
- Implement virtual scrolling for large tables
- Use React.memo for expensive components
- Optimize bundle size with tree shaking
- Enable gzip compression on server

**Database**:
- Regular ANALYZE TABLE maintenance
- Optimize slow queries (use EXPLAIN)
- Archive old data (orders older than 1 year)
- Set up read replicas for heavy read operations

---

## 19. CONCLUSION & NEXT STEPS

### 19.1 Documentation Summary

This comprehensive documentation provides:

✅ **Complete Module Specifications** (7 modules):
- Product Management
- Category Management
- Order Management
- Customer Support
- Financial Management
- User Management & Roles
- Analytics & Reporting

✅ **Full Architecture**:
- Frontend structure (React + TypeScript)
- Backend structure (Laravel 11)
- Database schema (26 tables)
- API specifications (40+ endpoints)

✅ **Security Implementation**:
- Authentication (Laravel Sanctum)
- Authorization (Role-based access control)
- Input validation
- Rate limiting
- Activity logging

✅ **Deployment Guide**:
- Server requirements
- Nginx configuration
- Database backups
- CI/CD setup

✅ **Lovable Integration**:
- Formatted for AI code generation
- Component generation prompts
- Customization guide

### 19.2 Development Roadmap

**Phase 1: Foundation** (Week 1-2)
- Set up development environment
- Implement authentication system
- Create base layout and routing
- Set up API client

**Phase 2: Core Modules** (Week 3-6)
- Product Management (Week 3)
- Category Management (Week 4)
- Order Management (Week 5)
- Customer Support (Week 6)

**Phase 3: Advanced Features** (Week 7-9)
- Financial Management (Week 7)
- User Management (Week 8)
- Analytics & Reporting (Week 9)

**Phase 4: Testing & Optimization** (Week 10-11)
- Unit tests
- Integration tests
- Performance optimization
- Security audit

**Phase 5: Deployment** (Week 12)
- Production deployment
- User acceptance testing
- Documentation finalization
- Training materials

### 19.3 Recommended Development Order

1. **Start with Authentication** - Users need to log in first
2. **Build Product Management** - Core data management
3. **Add Order Management** - Critical business function
4. **Implement Customer Support** - User-facing feature
5. **Create Financial Dashboard** - Business intelligence
6. **Add User Management** - Admin user control
7. **Build Analytics** - Data insights
8. **Optimize & Deploy** - Production readiness

### 19.4 Support & Resources

**Official Documentation**:
- Laravel 11: https://laravel.com/docs/11.x
- React 18: https://react.dev
- TanStack Query: https://tanstack.com/query
- shadcn/ui: https://ui.shadcn.com

**Community**:
- Laravel Forum: https://laracasts.com/discuss
- React Community: https://react.dev/community

**Tools**:
- Postman (API testing): https://www.postman.com
- TablePlus (Database GUI): https://tableplus.com
- Git: https://git-scm.com

---

**END OF PART 3 - DOCUMENTATION COMPLETE**

This comprehensive 3-part documentation provides everything needed to build a production-ready Admin & Sales Dashboard for the ELBARAKA platform. The documentation is enterprise-grade, compatible with Lovable for AI-assisted code generation, and follows industry best practices.

**Total Documentation Coverage**:
- **Part 1**: Executive Summary, Architecture, Core Technologies, Authentication, Modules 1-3 (Product, Category, Order Management)
- **Part 2**: Modules 4-5 (Customer Support, Financial Management)
- **Part 3**: Modules 6-7 (User Management, Analytics), Frontend/Backend Architecture, Security, Deployment, Lovable Integration, Appendices

**Ready for Development** ✅
