# ELBARAKA - Admin & Sales Dashboard (PART 2)
## Modules 4-7, Architecture, API Specs, Security & Deployment

---

## 8. MODULE 4: CUSTOMER SUPPORT & COMPLAINTS

### 8.1 Overview

**Purpose**: Manage customer support tickets (complaints) from submission to resolution, enabling efficient communication between customers and support staff, tracking issue resolution, and maintaining service quality metrics.

**Database Tables**:
- `complaints` (main ticket data)
- `complaint_messages` (conversation thread)
- `complaint_attachments` (supporting files)
- `users` (customers + support agents)
- `orders` (linked orders for context)

**Key Features**:
- View all support tickets with filtering
- Ticket detail view with message thread
- Reply to customer inquiries
- Update ticket status and priority
- Assign tickets to support agents
- Attach files/screenshots
- Internal notes (not visible to customers)
- Customer satisfaction ratings
- SLA tracking (response time)

### 8.2 Support Ticket Lifecycle

```
┌─────────┐
│  OPEN   │ ← Customer submits complaint
└────┬────┘
     │
     ▼
┌──────────────┐
│ IN_PROGRESS  │ ← Support agent assigned, working on issue
└───────┬──────┘
        │
        ├─► ┌─────────────────┐
        │   │AWAITING_RESPONSE│ ← Waiting for customer reply
        │   └────────┬────────┘
        │            │
        │◄───────────┘
        │
        ▼
┌──────────┐
│ RESOLVED │ ← Issue resolved, solution provided
└────┬─────┘
     │
     ▼
┌─────────┐
│ CLOSED  │ ← Ticket closed (after 48h or manual close)
└─────────┘
```

### 8.3 Database Schema

```sql
CREATE TABLE complaints (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NULL,
    assigned_to BIGINT UNSIGNED NULL COMMENT 'Support agent user_id',
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    category ENUM('order_issue', 'product_quality', 'delivery_problem', 
                  'payment_issue', 'technical_issue', 'general_inquiry', 
                  'suggestion', 'other') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'awaiting_response', 'resolved', 'closed') DEFAULT 'open',
    description TEXT NOT NULL,
    resolution_notes TEXT NULL,
    customer_rating TINYINT NULL CHECK (customer_rating >= 1 AND customer_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    first_response_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    resolved_by BIGINT UNSIGNED NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_ticket_number (ticket_number),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
);

CREATE TABLE complaint_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    message TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_complaint_id (complaint_id),
    INDEX idx_user_id (user_id)
);

CREATE TABLE complaint_attachments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT UNSIGNED NOT NULL,
    message_id BIGINT UNSIGNED NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INT NOT NULL,
    uploaded_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES complaint_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_complaint_id (complaint_id)
);
```

### 8.4 API Endpoints

#### 8.4.1 List Support Tickets

**Endpoint**: `GET /api/v1/admin/support/tickets`

**Query Parameters**:
```typescript
interface TicketListParams {
  page?: number;
  per_page?: number;
  search?: string;              // Search in ticket_number, subject
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  category?: TicketCategory[];
  assigned_to?: number | 'unassigned' | 'me';
  date_from?: string;
  date_to?: string;
  sort_by?: 'created_at' | 'updated_at' | 'priority';
  sort_order?: 'asc' | 'desc';
}

type TicketStatus = 'open' | 'in_progress' | 'awaiting_response' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketCategory = 'order_issue' | 'product_quality' | 'delivery_problem' | 
                      'payment_issue' | 'technical_issue' | 'general_inquiry' | 
                      'suggestion' | 'other';
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "ticket_number": "TKT-2026-001",
      "subject": "Damaged product received",
      "category": "product_quality",
      "priority": "high",
      "status": "in_progress",
      "customer": {
        "id": 2,
        "first_name": "Ahmed",
        "last_name": "Mohamed",
        "email": "ahmed@example.com",
        "phone": "+201111111111"
      },
      "order": {
        "id": 1,
        "order_number": "ORD-2026-001"
      },
      "assigned_to": {
        "id": 5,
        "first_name": "Sarah",
        "last_name": "Support",
        "role": "customer_support"
      },
      "messages_count": 3,
      "unread_messages_count": 1,
      "first_response_time": "00:45:30", // HH:MM:SS
      "created_at": "2026-01-20T10:00:00Z",
      "updated_at": "2026-01-20T15:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 45,
    "last_page": 3
  },
  "summary": {
    "total_tickets": 45,
    "open_count": 12,
    "in_progress_count": 8,
    "awaiting_response_count": 5,
    "resolved_count": 15,
    "closed_count": 5,
    "avg_first_response_time": "01:15:23",
    "avg_resolution_time": "12:45:00",
    "customer_satisfaction_avg": 4.2
  }
}
```

**Backend Implementation**:

```php
// app/Http/Controllers/Admin/SupportController.php
public function index(Request $request)
{
    $query = Complaint::with(['user', 'order', 'assignedTo'])
        ->withCount('messages');
    
    // Search
    if ($search = $request->input('search')) {
        $query->where(function($q) use ($search) {
            $q->where('ticket_number', 'LIKE', "%{$search}%")
              ->orWhere('subject', 'LIKE', "%{$search}%")
              ->orWhereHas('user', function($userQuery) use ($search) {
                  $userQuery->where('first_name', 'LIKE', "%{$search}%")
                           ->orWhere('last_name', 'LIKE', "%{$search}%");
              });
        });
    }
    
    // Status filter
    if ($status = $request->input('status')) {
        if (is_array($status)) {
            $query->whereIn('status', $status);
        } else {
            $query->where('status', $status);
        }
    }
    
    // Priority filter
    if ($priority = $request->input('priority')) {
        if (is_array($priority)) {
            $query->whereIn('priority', $priority);
        } else {
            $query->where('priority', $priority);
        }
    }
    
    // Category filter
    if ($category = $request->input('category')) {
        if (is_array($category)) {
            $query->whereIn('category', $category);
        } else {
            $query->where('category', $category);
        }
    }
    
    // Assignment filter
    if ($assignedTo = $request->input('assigned_to')) {
        if ($assignedTo === 'unassigned') {
            $query->whereNull('assigned_to');
        } elseif ($assignedTo === 'me') {
            $query->where('assigned_to', auth()->id());
        } else {
            $query->where('assigned_to', $assignedTo);
        }
    }
    
    // Date range
    if ($dateFrom = $request->input('date_from')) {
        $query->whereDate('created_at', '>=', $dateFrom);
    }
    if ($dateTo = $request->input('date_to')) {
        $query->whereDate('created_at', '<=', $dateTo);
    }
    
    // Sorting
    $sortBy = $request->input('sort_by', 'created_at');
    $sortOrder = $request->input('sort_order', 'desc');
    
    // Priority sorting: urgent > high > medium > low
    if ($sortBy === 'priority') {
        $query->orderByRaw("FIELD(priority, 'urgent', 'high', 'medium', 'low') " . strtoupper($sortOrder));
    } else {
        $query->orderBy($sortBy, $sortOrder);
    }
    
    $perPage = min($request->input('per_page', 20), 100);
    $tickets = $query->paginate($perPage);
    
    // Calculate summary statistics
    $summary = [
        'total_tickets' => Complaint::count(),
        'open_count' => Complaint::where('status', 'open')->count(),
        'in_progress_count' => Complaint::where('status', 'in_progress')->count(),
        'awaiting_response_count' => Complaint::where('status', 'awaiting_response')->count(),
        'resolved_count' => Complaint::where('status', 'resolved')->count(),
        'closed_count' => Complaint::where('status', 'closed')->count(),
        'avg_first_response_time' => $this->calculateAvgResponseTime(),
        'avg_resolution_time' => $this->calculateAvgResolutionTime(),
        'customer_satisfaction_avg' => Complaint::whereNotNull('customer_rating')->avg('customer_rating'),
    ];
    
    return response()->json([
        'data' => ComplaintResource::collection($tickets),
        'meta' => [
            'current_page' => $tickets->currentPage(),
            'per_page' => $tickets->perPage(),
            'total' => $tickets->total(),
            'last_page' => $tickets->lastPage(),
        ],
        'summary' => $summary,
    ]);
}
```

#### 8.4.2 Get Ticket Details

**Endpoint**: `GET /api/v1/admin/support/tickets/{id}`

**Response**:
```json
{
  "data": {
    "id": 1,
    "ticket_number": "TKT-2026-001",
    "subject": "Damaged product received",
    "description": "I received my order but one of the products was damaged...",
    "category": "product_quality",
    "priority": "high",
    "status": "in_progress",
    "customer": {
      "id": 2,
      "first_name": "Ahmed",
      "last_name": "Mohamed",
      "email": "ahmed@example.com",
      "phone": "+201111111111",
      "avatar": "https://example.com/avatars/ahmed.jpg",
      "total_orders": 15,
      "lifetime_value": "4,500.00"
    },
    "order": {
      "id": 1,
      "order_number": "ORD-2026-001",
      "total": "305.00",
      "status": "delivered",
      "delivery_date": "2026-01-15"
    },
    "assigned_to": {
      "id": 5,
      "first_name": "Sarah",
      "last_name": "Support",
      "email": "sarah.support@elbaraka.com",
      "role": "customer_support"
    },
    "messages": [
      {
        "id": 1,
        "user": {
          "id": 2,
          "first_name": "Ahmed",
          "last_name": "Mohamed",
          "avatar": "https://example.com/avatars/ahmed.jpg"
        },
        "message": "I received my order but the apples were damaged...",
        "is_internal_note": false,
        "is_admin_reply": false,
        "attachments": [
          {
            "id": 1,
            "file_name": "damaged_apples.jpg",
            "file_path": "/storage/complaints/1/damaged_apples.jpg",
            "file_type": "image/jpeg",
            "file_size": 245000
          }
        ],
        "created_at": "2026-01-20T10:00:00Z"
      },
      {
        "id": 2,
        "user": {
          "id": 5,
          "first_name": "Sarah",
          "last_name": "Support",
          "avatar": null
        },
        "message": "We sincerely apologize for the inconvenience...",
        "is_internal_note": false,
        "is_admin_reply": true,
        "attachments": [],
        "created_at": "2026-01-20T10:45:00Z"
      },
      {
        "id": 3,
        "user": {
          "id": 5,
          "first_name": "Sarah",
          "last_name": "Support"
        },
        "message": "Internal: Customer has history of complaints, escalate to manager.",
        "is_internal_note": true,
        "is_admin_reply": false,
        "attachments": [],
        "created_at": "2026-01-20T10:46:00Z"
      }
    ],
    "resolution_notes": null,
    "customer_rating": null,
    "first_response_time": "00:45:00",
    "resolution_time": null,
    "created_at": "2026-01-20T10:00:00Z",
    "updated_at": "2026-01-20T15:30:00Z",
    "first_response_at": "2026-01-20T10:45:00Z",
    "resolved_at": null,
    "closed_at": null
  }
}
```

#### 8.4.3 Reply to Ticket

**Endpoint**: `POST /api/v1/admin/support/tickets/{id}/reply`

**Authorization**: `super_admin`, `admin`, `customer_support`

**Request Body** (multipart/form-data):
```json
{
  "message": "We have processed a refund for the damaged items...",
  "is_internal_note": false,
  "attachments": [/* File uploads */],
  "update_status": "resolved", // Optional: Update ticket status
  "resolution_notes": "Refund processed, customer satisfied" // Optional
}
```

**Validation**:
```php
return [
    'message' => 'required|string|max:5000',
    'is_internal_note' => 'boolean',
    'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120', // 5MB max
    'update_status' => 'nullable|in:open,in_progress,awaiting_response,resolved,closed',
    'resolution_notes' => 'nullable|string|max:1000',
];
```

**Response**:
```json
{
  "message": "Reply posted successfully",
  "data": {
    "message_id": 4,
    "ticket_status": "resolved",
    "created_at": "2026-01-20T16:00:00Z"
  }
}
```

**Backend Implementation**:

```php
public function reply(Request $request, $id)
{
    $validated = $request->validate([
        'message' => 'required|string|max:5000',
        'is_internal_note' => 'boolean',
        'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
        'update_status' => 'nullable|in:open,in_progress,awaiting_response,resolved,closed',
        'resolution_notes' => 'nullable|string|max:1000',
    ]);
    
    $complaint = Complaint::findOrFail($id);
    
    DB::transaction(function() use ($complaint, $validated, $request) {
        // Create message
        $message = ComplaintMessage::create([
            'complaint_id' => $complaint->id,
            'user_id' => auth()->id(),
            'message' => $validated['message'],
            'is_internal_note' => $validated['is_internal_note'] ?? false,
            'is_admin_reply' => true,
        ]);
        
        // Handle file attachments
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store("complaints/{$complaint->id}", 'private');
                
                ComplaintAttachment::create([
                    'complaint_id' => $complaint->id,
                    'message_id' => $message->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'uploaded_by' => auth()->id(),
                ]);
            }
        }
        
        // Update first response time if this is the first admin reply
        if (!$complaint->first_response_at) {
            $complaint->first_response_at = now();
        }
        
        // Update status if requested
        if (isset($validated['update_status'])) {
            $complaint->status = $validated['update_status'];
            
            if ($validated['update_status'] === 'resolved') {
                $complaint->resolved_at = now();
                $complaint->resolved_by = auth()->id();
                $complaint->resolution_notes = $validated['resolution_notes'] ?? null;
            } elseif ($validated['update_status'] === 'closed') {
                $complaint->closed_at = now();
            }
        }
        
        $complaint->save();
        
        // Send notification to customer (if not internal note)
        if (!($validated['is_internal_note'] ?? false)) {
            $complaint->user->notify(new ComplaintReplyReceived($complaint, $message));
        }
        
        // Log activity
        activity()
            ->performedOn($complaint)
            ->causedBy(auth()->user())
            ->withProperties(['message_id' => $message->id])
            ->log('complaint_reply_posted');
    });
    
    return response()->json([
        'message' => 'Reply posted successfully',
        'data' => new ComplaintResource($complaint->fresh()),
    ]);
}
```

#### 8.4.4 Update Ticket Status

**Endpoint**: `PUT /api/v1/admin/support/tickets/{id}/status`

**Request Body**:
```json
{
  "status": "resolved",
  "priority": "medium",
  "assigned_to": 5,
  "resolution_notes": "Issue resolved via refund"
}
```

**Response**:
```json
{
  "message": "Ticket status updated successfully",
  "data": { /* updated ticket */ }
}
```

#### 8.4.5 Assign Ticket to Agent

**Endpoint**: `POST /api/v1/admin/support/tickets/{id}/assign`

**Request Body**:
```json
{
  "assigned_to": 5  // User ID of support agent
}
```

**Response**:
```json
{
  "message": "Ticket assigned successfully",
  "data": {
    "id": 1,
    "assigned_to": {
      "id": 5,
      "first_name": "Sarah",
      "last_name": "Support"
    }
  }
}
```

#### 8.4.6 Close Ticket

**Endpoint**: `POST /api/v1/admin/support/tickets/{id}/close`

**Request Body**:
```json
{
  "resolution_notes": "Refund processed, customer satisfied"
}
```

**Response**:
```json
{
  "message": "Ticket closed successfully",
  "data": {
    "id": 1,
    "status": "closed",
    "closed_at": "2026-01-20T18:00:00Z"
  }
}
```

### 8.5 Frontend Pages

#### 8.5.1 Support Tickets List Page

**Route**: `/admin/support/tickets`

**Components**:

- **Summary Cards**:
  - Open Tickets (count with red badge)
  - In Progress (count with yellow badge)
  - Resolved Today (count with green badge)
  - Avg Response Time (HH:MM format)
  - Customer Satisfaction (star rating avg)

- **Filters Panel**:
  - Search (ticket number, subject, customer name)
  - Status multi-select
  - Priority multi-select
  - Category dropdown
  - Assigned to dropdown (All, Unassigned, Me, Specific agent)
  - Date range picker

- **Kanban Board View** (Optional alternate view):
  - Columns for each status (Open, In Progress, Awaiting Response, Resolved)
  - Drag & drop to change status
  - Color-coded by priority

- **Data Table View** with columns:
  - Ticket Number (clickable)
  - Subject (truncated if long)
  - Customer Name
  - Category Badge
  - Priority Badge (color-coded: red=urgent, orange=high, yellow=medium, gray=low)
  - Status Badge
  - Assigned To (avatar + name)
  - Messages Count (with unread indicator)
  - Response Time (first response)
  - Created At
  - Actions (View, Assign, Close)

- **Toolbar**:
  - "My Tickets" quick filter
  - "Unassigned" quick filter
  - View toggle (Table / Kanban)
  - Export CSV button

### 8.5.2 Ticket Detail Page

**Route**: `/admin/support/tickets/{id}`

**Components**:

1. **Header Section**:
   - Ticket Number (large)
   - Status Badge
   - Priority Badge
   - Quick Actions (Assign, Update Status, Close)

2. **Customer Card**:
   - Customer avatar + name
   - Email (mailto link)
   - Phone (tel link)
   - Total Orders
   - Lifetime Value
   - Link to customer profile

3. **Ticket Information Card**:
   - Subject
   - Category
   - Related Order (if any) - clickable link
   - Created At
   - Last Updated
   - First Response Time
   - Resolution Time (if resolved)
   - Assigned To (with reassign button)

4. **Message Thread**:
   - Chronological list of messages
   - Customer messages (left-aligned, gray background)
   - Admin replies (right-aligned, blue background)
   - Internal notes (yellow background, lock icon)
   - Timestamp for each message
   - Attachment thumbnails/links
   - Reply indicator (shows if customer has unread replies)

5. **Reply Box** (sticky at bottom):
   - Rich text editor
   - File attachment button
   - "Internal Note" checkbox
   - "Send Reply" button
   - Status update dropdown (Update to: Resolved, Awaiting Response, etc.)
   - Resolution notes textarea (shown when status = resolved)

6. **Activity Timeline** (right sidebar):
   - All actions taken on this ticket
   - Status changes
   - Assignments
   - Replies sent
   - Timestamps and user who performed action

**State Management**:
```typescript
interface TicketDetailState {
  ticket: Ticket | null;
  messages: Message[];
  replyText: string;
  attachments: File[];
  isInternalNote: boolean;
  updateStatus: TicketStatus | null;
  isSending: boolean;
}
```

### 8.6 Frontend Implementation Example

```typescript
// pages/admin/support/tickets/[id].tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { MessageThread } from '@/components/support/MessageThread';
import { ReplyBox } from '@/components/support/ReplyBox';
import { supportApi } from '@/services/api/supportApi';

export default function TicketDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [replyData, setReplyData] = useState({
    message: '',
    is_internal_note: false,
    update_status: null,
    resolution_notes: '',
  });

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['support-ticket', id],
    queryFn: () => supportApi.getTicket(id),
  });

  const replyMutation = useMutation({
    mutationFn: (data: ReplyData) => supportApi.replyToTicket(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', id] });
      setReplyData({
        message: '',
        is_internal_note: false,
        update_status: null,
        resolution_notes: '',
      });
      toast.success('Reply sent successfully');
    },
  });

  const assignMutation = useMutation({
    mutationFn: (agentId: number) => supportApi.assignTicket(id, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', id] });
      toast.success('Ticket assigned successfully');
    },
  });

  const handleSendReply = async (attachments?: File[]) => {
    const formData = new FormData();
    formData.append('message', replyData.message);
    formData.append('is_internal_note', String(replyData.is_internal_note));
    
    if (replyData.update_status) {
      formData.append('update_status', replyData.update_status);
    }
    if (replyData.resolution_notes) {
      formData.append('resolution_notes', replyData.resolution_notes);
    }
    if (attachments) {
      attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }
    
    replyMutation.mutate(formData);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  {ticket.ticket_number}
                </h1>
                <h2 className="text-lg text-gray-700">{ticket.subject}</h2>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => openAssignModal()}>
                Assign
              </Button>
              <Button variant="outline" onClick={() => openUpdateStatusModal()}>
                Update Status
              </Button>
              <Button variant="outline" onClick={() => closeTicket()}>
                Close Ticket
              </Button>
            </div>
          </div>

          {/* Customer Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="font-semibold mb-4">Customer Information</h3>
            <div className="flex items-center gap-4">
              <img
                src={ticket.customer.avatar || '/default-avatar.png'}
                alt={`${ticket.customer.first_name} ${ticket.customer.last_name}`}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <div className="font-medium text-lg">
                  {ticket.customer.first_name} {ticket.customer.last_name}
                </div>
                <div className="text-sm text-gray-600">
                  <a href={`mailto:${ticket.customer.email}`} className="text-blue-600 hover:underline">
                    {ticket.customer.email}
                  </a>
                </div>
                <div className="text-sm text-gray-600">
                  <a href={`tel:${ticket.customer.phone}`} className="text-blue-600 hover:underline">
                    {ticket.customer.phone}
                  </a>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {ticket.customer.total_orders} orders • {ticket.customer.lifetime_value} EGP LTV
                </div>
              </div>
            </div>
          </div>

          {/* Message Thread */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="font-semibold mb-4">Conversation</h3>
            <MessageThread messages={ticket.messages} />
          </div>

          {/* Reply Box */}
          <div className="bg-white rounded-lg shadow-md p-6 sticky bottom-0">
            <ReplyBox
              value={replyData.message}
              onChange={(message) => setReplyData({ ...replyData, message })}
              isInternalNote={replyData.is_internal_note}
              onInternalNoteChange={(isInternal) =>
                setReplyData({ ...replyData, is_internal_note: isInternal })
              }
              updateStatus={replyData.update_status}
              onUpdateStatusChange={(status) =>
                setReplyData({ ...replyData, update_status: status })
              }
              resolutionNotes={replyData.resolution_notes}
              onResolutionNotesChange={(notes) =>
                setReplyData({ ...replyData, resolution_notes: notes })
              }
              onSend={handleSendReply}
              isSending={replyMutation.isPending}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Ticket Info Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="font-semibold mb-4">Ticket Details</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Category</div>
                <div className="font-medium">
                  <CategoryBadge category={ticket.category} />
                </div>
              </div>
              
              {ticket.order && (
                <div>
                  <div className="text-sm text-gray-500">Related Order</div>
                  <Link
                    to={`/admin/orders/${ticket.order.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {ticket.order.order_number}
                  </Link>
                </div>
              )}
              
              <div>
                <div className="text-sm text-gray-500">Assigned To</div>
                <div className="font-medium">
                  {ticket.assigned_to
                    ? `${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name}`
                    : 'Unassigned'}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">First Response Time</div>
                <div className="font-medium">{ticket.first_response_time || 'N/A'}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Created</div>
                <div className="font-medium">
                  {format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold mb-4">Activity Timeline</h3>
            <ActivityTimeline ticketId={ticket.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 9. MODULE 5: FINANCIAL MANAGEMENT & MONEY FLOW

### 9.1 Overview

**Purpose**: Track all financial transactions, revenue, refunds, payment methods, and generate comprehensive financial reports for accounting and business intelligence.

**Database Tables**:
- `orders` (revenue source)
- `payment_transactions` (all payment records)
- `paymob_payments` (Paymob-specific tracking)
- `promo_codes` (discounts applied)
- `promo_code_usage` (discount audit trail)

**Key Features**:
- Revenue dashboard (daily/weekly/monthly/yearly)
- Payment method breakdown (cash vs card vs wallet)
- Refund management and tracking
- Discount and promo code usage analytics
- Financial reports export (CSV/Excel/PDF)
- Daily/weekly/monthly reconciliation
- Tax calculations and summaries
- Profit margin analysis
- Payment gateway reconciliation

### 9.2 Financial Data Model

```sql
-- Payment Transactions (All payment records)
CREATE TABLE payment_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    transaction_id VARCHAR(255) NOT NULL UNIQUE,
    payment_method ENUM('cash_on_delivery', 'card', 'wallet') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    gateway_response JSON NULL,
    processed_at TIMESTAMP NULL,
    refunded_at TIMESTAMP NULL,
    refund_amount DECIMAL(10, 2) NULL,
    refund_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_status (status),
    INDEX idx_payment_method (payment_method),
    INDEX idx_processed_at (processed_at)
);

-- Paymob Payments (Specific to Paymob gateway)
CREATE TABLE paymob_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    internal_order_id VARCHAR(255) NOT NULL,
    paymob_order_id VARCHAR(255) NULL,
    transaction_id VARCHAR(255) NULL,
    amount_cents INT NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP',
    payment_method ENUM('CARD', 'WALLET') NOT NULL,
    status ENUM('PENDING', 'PAID', 'FAILED') DEFAULT 'PENDING',
    payment_token TEXT NULL,
    hmac_signature VARCHAR(255) NULL,
    billing_data JSON NULL,
    paymob_response JSON NULL,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_transaction_id (transaction_id)
);

-- Promo Code Usage
CREATE TABLE promo_code_usage (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    promo_code_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_promo_code_id (promo_code_id),
    INDEX idx_user_id (user_id),
    INDEX idx_order_id (order_id),
    INDEX idx_created_at (created_at)
);
```

### 9.3 API Endpoints

#### 9.3.1 Financial Dashboard Summary

**Endpoint**: `GET /api/v1/admin/financial/dashboard`

**Query Parameters**:
```typescript
interface FinancialDashboardParams {
  date_from: string;  // ISO date, default: 30 days ago
  date_to: string;    // ISO date, default: today
  compare_previous_period?: boolean;  // Default: true
}
```

**Response**:
```json
{
  "data": {
    "period": {
      "from": "2026-01-01",
      "to": "2026-01-31"
    },
    "revenue": {
      "total": "125,450.00",
      "total_orders": 420,
      "average_order_value": "298.69",
      "comparison": {
        "previous_period_total": "98,320.00",
        "change_percentage": 27.6,
        "change_amount": "27,130.00"
      }
    },
    "by_payment_method": {
      "cash_on_delivery": {
        "total": "45,200.00",
        "orders_count": 150,
        "percentage": 36.0
      },
      "card": {
        "total": "72,100.00",
        "orders_count": 230,
        "percentage": 57.5
      },
      "wallet": {
        "total": "8,150.00",
        "orders_count": 40,
        "percentage": 6.5
      }
    },
    "refunds": {
      "total_refunded": "3,450.00",
      "refund_count": 12,
      "refund_rate_percentage": 2.75
    },
    "discounts": {
      "total_discounts_given": "8,920.00",
      "promo_code_usage_count": 89,
      "average_discount": "100.22"
    },
    "taxes": {
      "total_tax_collected": "17,563.00",
      "tax_rate": 14.0
    },
    "delivery_fees": {
      "total_collected": "8,400.00",
      "average_fee": "20.00"
    },
    "profit": {
      "gross_profit": "58,230.00",
      "gross_margin_percentage": 46.4,
      "net_profit": "49,310.00",
      "net_margin_percentage": 39.3
    },
    "daily_breakdown": [
      {
        "date": "2026-01-01",
        "revenue": "4,250.00",
        "orders_count": 15,
        "refunds": "0.00"
      },
      {
        "date": "2026-01-02",
        "revenue": "5,100.00",
        "orders_count": 18,
        "refunds": "120.00"
      }
      // ... more daily data
    ]
  }
}
```

**Backend Implementation**:

```php
// app/Http/Controllers/Admin/FinancialController.php
public function dashboard(Request $request)
{
    $dateFrom = $request->input('date_from', now()->subDays(30)->toDateString());
    $dateTo = $request->input('date_to', now()->toDateString());
    $comparePrevious = $request->boolean('compare_previous_period', true);
    
    // Calculate period length for comparison
    $periodDays = Carbon::parse($dateFrom)->diffInDays(Carbon::parse($dateTo));
    $previousFrom = Carbon::parse($dateFrom)->subDays($periodDays)->toDateString();
    $previousTo = Carbon::parse($dateFrom)->subDay()->toDateString();
    
    // Current period revenue
    $currentRevenue = Order::whereBetween('created_at', [$dateFrom, $dateTo])
        ->where('payment_status', 'completed')
        ->sum('total');
    
    $currentOrdersCount = Order::whereBetween('created_at', [$dateFrom, $dateTo])
        ->where('payment_status', 'completed')
        ->count();
    
    // Previous period for comparison
    $previousRevenue = 0;
    if ($comparePrevious) {
        $previousRevenue = Order::whereBetween('created_at', [$previousFrom, $previousTo])
            ->where('payment_status', 'completed')
            ->sum('total');
    }
    
    // Payment method breakdown
    $byPaymentMethod = Order::selectRaw('
            payment_method,
            SUM(total) as total,
            COUNT(*) as orders_count,
            (SUM(total) / ? * 100) as percentage
        ', [$currentRevenue ?: 1])
        ->whereBetween('created_at', [$dateFrom, $dateTo])
        ->where('payment_status', 'completed')
        ->groupBy('payment_method')
        ->get()
        ->keyBy('payment_method');
    
    // Refunds
    $refunds = PaymentTransaction::whereBetween('refunded_at', [$dateFrom, $dateTo])
        ->where('status', 'refunded')
        ->selectRaw('SUM(refund_amount) as total, COUNT(*) as count')
        ->first();
    
    // Discounts
    $discounts = Order::whereBetween('created_at', [$dateFrom, $dateTo])
        ->selectRaw('SUM(discount) as total, COUNT(*) as count')
        ->where('discount', '>', 0)
        ->first();
    
    // Taxes
    $taxes = Order::whereBetween('created_at', [$dateFrom, $dateTo])
        ->where('payment_status', 'completed')
        ->sum('tax');
    
    // Delivery fees
    $deliveryFees = Order::whereBetween('created_at', [$dateFrom, $dateTo])
        ->where('payment_status', 'completed')
        ->selectRaw('SUM(delivery_fee) as total, AVG(delivery_fee) as average')
        ->first();
    
    // Profit calculation
    $totalCost = OrderItem::join('orders', 'order_items.order_id', '=', 'orders.id')
        ->join('products', 'order_items.product_id', '=', 'products.barcode')
        ->whereBetween('orders.created_at', [$dateFrom, $dateTo])
        ->where('orders.payment_status', 'completed')
        ->selectRaw('SUM(order_items.quantity * products.cost_price) as total_cost')
        ->value('total_cost') ?: 0;
    
    $grossProfit = $currentRevenue - $totalCost;
    $netProfit = $grossProfit - ($refunds->total ?? 0);
    
    // Daily breakdown
    $dailyBreakdown = Order::selectRaw('
            DATE(created_at) as date,
            SUM(total) as revenue,
            COUNT(*) as orders_count,
            (SELECT COALESCE(SUM(refund_amount), 0) 
             FROM payment_transactions 
             WHERE DATE(refunded_at) = DATE(orders.created_at) 
             AND status = "refunded") as refunds
        ')
        ->whereBetween('created_at', [$dateFrom, $dateTo])
        ->where('payment_status', 'completed')
        ->groupBy('date')
        ->orderBy('date', 'asc')
        ->get();
    
    return response()->json([
        'data' => [
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'revenue' => [
                'total' => number_format($currentRevenue, 2),
                'total_orders' => $currentOrdersCount,
                'average_order_value' => number_format($currentRevenue / max($currentOrdersCount, 1), 2),
                'comparison' => [
                    'previous_period_total' => number_format($previousRevenue, 2),
                    'change_percentage' => $previousRevenue > 0 
                        ? round((($currentRevenue - $previousRevenue) / $previousRevenue) * 100, 2)
                        : 0,
                    'change_amount' => number_format($currentRevenue - $previousRevenue, 2),
                ],
            ],
            'by_payment_method' => $byPaymentMethod,
            'refunds' => [
                'total_refunded' => number_format($refunds->total ?? 0, 2),
                'refund_count' => $refunds->count ?? 0,
                'refund_rate_percentage' => round((($refunds->total ?? 0) / $currentRevenue) * 100, 2),
            ],
            'discounts' => [
                'total_discounts_given' => number_format($discounts->total ?? 0, 2),
                'promo_code_usage_count' => $discounts->count ?? 0,
                'average_discount' => number_format(($discounts->total ?? 0) / max($discounts->count ?? 1, 1), 2),
            ],
            'taxes' => [
                'total_tax_collected' => number_format($taxes, 2),
                'tax_rate' => 14.0,
            ],
            'delivery_fees' => [
                'total_collected' => number_format($deliveryFees->total ?? 0, 2),
                'average_fee' => number_format($deliveryFees->average ?? 0, 2),
            ],
            'profit' => [
                'gross_profit' => number_format($grossProfit, 2),
                'gross_margin_percentage' => round(($grossProfit / $currentRevenue) * 100, 2),
                'net_profit' => number_format($netProfit, 2),
                'net_margin_percentage' => round(($netProfit / $currentRevenue) * 100, 2),
            ],
            'daily_breakdown' => $dailyBreakdown,
        ],
    ]);
}
```

#### 9.3.2 Payment Transactions List

**Endpoint**: `GET /api/v1/admin/financial/transactions`

**Query Parameters**:
```typescript
interface TransactionListParams {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  payment_method?: 'cash_on_delivery' | 'card' | 'wallet';
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
  search?: string;  // Search by transaction_id or order_number
  sort_by?: 'created_at' | 'amount' | 'processed_at';
  sort_order?: 'asc' | 'desc';
}
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "transaction_id": "paymob_txn_12345",
      "order_id": 1,
      "order_number": "ORD-2026-001",
      "customer_name": "Ahmed Mohamed",
      "payment_method": "card",
      "amount": "305.00",
      "status": "completed",
      "processed_at": "2026-01-10T14:32:00Z",
      "refunded_at": null,
      "refund_amount": null,
      "created_at": "2026-01-10T14:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 420,
    "last_page": 21
  },
  "summary": {
    "total_transactions": 420,
    "total_amount": "125,450.00",
    "completed_count": 395,
    "pending_count": 15,
    "failed_count": 7,
    "refunded_count": 3
  }
}
```

#### 9.3.3 Process Refund

**Endpoint**: `POST /api/v1/admin/financial/transactions/{id}/refund`

**Authorization**: `super_admin`, `admin`, `accountant`

**Request Body**:
```json
{
  "refund_amount": 305.00,  // Can be partial or full
  "refund_reason": "Damaged product, customer dissatisfied",
  "notify_customer": true
}
```

**Validation**:
```php
return [
    'refund_amount' => 'required|numeric|min:0.01|max:' . $transaction->amount,
    'refund_reason' => 'required|string|max:500',
    'notify_customer' => 'boolean',
];
```

**Response**:
```json
{
  "message": "Refund processed successfully",
  "data": {
    "transaction_id": "paymob_txn_12345",
    "refund_amount": "305.00",
    "status": "refunded",
    "refunded_at": "2026-01-20T16:00:00Z"
  }
}
```

**Backend Implementation**:

```php
public function refund(Request $request, $id)
{
    $validated = $request->validate([
        'refund_amount' => 'required|numeric|min:0.01',
        'refund_reason' => 'required|string|max:500',
        'notify_customer' => 'boolean',
    ]);
    
    $transaction = PaymentTransaction::findOrFail($id);
    
    // Validation
    if ($transaction->status === 'refunded') {
        return response()->json(['message' => 'Transaction already refunded'], 422);
    }
    
    if ($validated['refund_amount'] > $transaction->amount) {
        return response()->json(['message' => 'Refund amount exceeds transaction amount'], 422);
    }
    
    DB::transaction(function() use ($transaction, $validated) {
        $transaction->status = 'refunded';
        $transaction->refund_amount = $validated['refund_amount'];
        $transaction->refund_reason = $validated['refund_reason'];
        $transaction->refunded_at = now();
        $transaction->save();
        
        // Update order payment status
        $order = $transaction->order;
        $order->payment_status = 'refunded';
        $order->save();
        
        // TODO: Trigger actual refund via payment gateway
        // if ($transaction->payment_method === 'card') {
        //     PaymobService::processRefund($transaction);
        // }
        
        // Log activity
        activity()
            ->performedOn($transaction)
            ->causedBy(auth()->user())
            ->withProperties([
                'refund_amount' => $validated['refund_amount'],
                'reason' => $validated['refund_reason'],
            ])
            ->log('payment_refunded');
        
        // Notify customer if requested
        if ($validated['notify_customer']) {
            $order->user->notify(new RefundProcessed($transaction));
        }
    });
    
    return response()->json([
        'message' => 'Refund processed successfully',
        'data' => new PaymentTransactionResource($transaction->fresh()),
    ]);
}
```

#### 9.3.4 Promo Code Analytics

**Endpoint**: `GET /api/v1/admin/financial/promo-codes/analytics`

**Query Parameters**:
```typescript
interface PromoCodeAnalyticsParams {
  date_from: string;
  date_to: string;
  promo_code_id?: number;  // Specific promo code analysis
}
```

**Response**:
```json
{
  "data": {
    "summary": {
      "total_promo_codes": 10,
      "active_promo_codes": 7,
      "total_usage": 156,
      "total_discount_given": "15,620.00",
      "total_revenue_with_promos": "98,450.00"
    },
    "by_promo_code": [
      {
        "id": 1,
        "code": "WELCOME10",
        "type": "percentage",
        "value": "10.00",
        "usage_count": 45,
        "total_discount_given": "4,520.00",
        "revenue_generated": "40,680.00",
        "avg_order_value": "904.00",
        "conversion_rate": 75.0
      },
      {
        "id": 2,
        "code": "SAVE20",
        "type": "percentage",
        "value": "20.00",
        "usage_count": 32,
        "total_discount_given": "6,400.00",
        "revenue_generated": "25,600.00",
        "avg_order_value": "800.00",
        "conversion_rate": 64.0
      }
    ],
    "top_users": [
      {
        "user_id": 2,
        "user_name": "Ahmed Mohamed",
        "promo_codes_used": 5,
        "total_discount_received": "520.00",
        "total_orders": 8
      }
    ]
  }
}
```

#### 9.3.5 Export Financial Report

**Endpoint**: `GET /api/v1/admin/financial/export`

**Query Parameters**:
```typescript
interface FinancialExportParams {
  date_from: string;
  date_to: string;
  format: 'csv' | 'excel' | 'pdf';
  report_type: 'revenue' | 'transactions' | 'refunds' | 'promo_codes' | 'comprehensive';
}
```

**Response**: File download (CSV/Excel/PDF)

**CSV Format** (Revenue Report):
```csv
Date,Orders Count,Gross Revenue,Discounts,Delivery Fees,Tax,Refunds,Net Revenue
2026-01-01,15,4250.00,320.00,300.00,595.00,0.00,4520.00
2026-01-02,18,5100.00,450.00,360.00,714.00,120.00,5024.00
```

### 9.4 Frontend Pages

#### 9.4.1 Financial Dashboard Page

**Route**: `/admin/financial`

**Components**:

- **Period Selector** (Top):
  - Quick filters (Today, Yesterday, This Week, This Month, Last Month, Custom Range)
  - Date range picker
  - Compare with previous period checkbox

- **KPI Cards** (Highlighted Metrics):
  - **Total Revenue** (large, emphasized)
    - Amount
    - Change from previous period (% and amount)
    - Trend arrow (up/down)
  - **Total Orders**
    - Count
    - Change from previous period
  - **Average Order Value**
    - Amount
    - Change from previous period
  - **Refund Rate**
    - Percentage
    - Total refunded amount

- **Revenue Chart** (Line/Area Chart):
  - Daily revenue over selected period
  - Multiple lines: Gross Revenue, Net Revenue, Refunds
  - Hover tooltips with exact values
  - Zoom and pan controls

- **Payment Method Pie Chart**:
  - Cash on Delivery (%)
  - Card (%)
  - Wallet (%)
  - Hover tooltips with amounts and order counts

- **Revenue Breakdown Table**:
  - Gross Revenue
  - Delivery Fees
  - Discounts (negative)
  - Tax
  - Refunds (negative)
  - **Net Revenue** (calculated, bold)

- **Top Metrics Grid**:
  - Gross Profit
  - Gross Margin (%)
  - Net Profit
  - Net Margin (%)

- **Export Actions**:
  - Export as CSV
  - Export as Excel
  - Export as PDF
  - Schedule email report

#### 9.4.2 Transactions List Page

**Route**: `/admin/financial/transactions`

**Components**:

- **Filters Panel**:
  - Search (transaction ID, order number)
  - Date range picker
  - Payment method dropdown
  - Status multi-select
  - Amount range slider

- **Data Table** with columns:
  - Transaction ID (clickable)
  - Order Number (clickable link to order)
  - Customer Name
  - Payment Method Icon
  - Amount (emphasized, green if completed, red if refunded)
  - Status Badge
  - Processed At
  - Actions (View Details, Refund if applicable)

- **Summary Cards**:
  - Total Transactions
  - Total Amount
  - Completed Count
  - Pending Count
  - Refunded Count

- **Bulk Actions**:
  - Export selected
  - Mark as reconciled

#### 9.4.3 Refund Modal

**Components**:
- Transaction details display
- Original amount
- Refund amount input (max = original amount)
- Refund reason textarea
- Notify customer checkbox
- Process Refund button (confirmation required)

### 9.5 Frontend Implementation Example

```typescript
// pages/admin/financial/dashboard.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateRangePicker } from '@/components/DateRangePicker';
import { RevenueChart } from '@/components/financial/RevenueChart';
import { PaymentMethodPieChart } from '@/components/financial/PaymentMethodPieChart';
import { financialApi } from '@/services/api/financialApi';
import { subDays, format } from 'date-fns';

export default function FinancialDashboardPage() {
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [comparePrevious, setComparePrevious] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['financial-dashboard', dateRange, comparePrevious],
    queryFn: () =>
      financialApi.getDashboard({
        date_from: dateRange.from,
        date_to: dateRange.to,
        compare_previous_period: comparePrevious,
      }),
  });

  const exportReport = async (format: 'csv' | 'excel' | 'pdf') => {
    await financialApi.exportReport({
      date_from: dateRange.from,
      date_to: dateRange.to,
      format,
      report_type: 'comprehensive',
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Financial Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('csv')}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport('excel')}>
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-4 items-center">
          <QuickFilters
            onSelect={(range) => setDateRange(range)}
            selected={dateRange}
          />
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
          value={`${data?.revenue.total} EGP`}
          change={{
            percentage: data?.revenue.comparison.change_percentage,
            amount: data?.revenue.comparison.change_amount,
          }}
          trend={data?.revenue.comparison.change_percentage > 0 ? 'up' : 'down'}
          emphasized
        />
        <MetricCard
          title="Total Orders"
          value={data?.revenue.total_orders}
          change={/* comparison data */}
        />
        <MetricCard
          title="Avg Order Value"
          value={`${data?.revenue.average_order_value} EGP`}
          change={/* comparison data */}
        />
        <MetricCard
          title="Refund Rate"
          value={`${data?.refunds.refund_rate_percentage}%`}
          subtitle={`${data?.refunds.total_refunded} EGP refunded`}
          trend="down"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4">Revenue Trend</h3>
          <RevenueChart data={data?.daily_breakdown} />
        </div>

        {/* Payment Method Pie Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4">Payment Methods</h3>
          <PaymentMethodPieChart data={data?.by_payment_method} />
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4">Revenue Breakdown</h3>
        <table className="w-full">
          <tbody>
            <tr className="border-b">
              <td className="py-2 font-medium">Gross Revenue</td>
              <td className="py-2 text-right text-green-600 font-semibold">
                {data?.revenue.total} EGP
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-medium">Delivery Fees</td>
              <td className="py-2 text-right">
                + {data?.delivery_fees.total_collected} EGP
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-medium">Discounts</td>
              <td className="py-2 text-right text-red-600">
                - {data?.discounts.total_discounts_given} EGP
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-medium">Tax Collected</td>
              <td className="py-2 text-right">
                {data?.taxes.total_tax_collected} EGP
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-medium">Refunds</td>
              <td className="py-2 text-right text-red-600">
                - {data?.refunds.total_refunded} EGP
              </td>
            </tr>
            <tr className="border-t-2 border-gray-800">
              <td className="py-2 font-bold text-lg">Net Revenue</td>
              <td className="py-2 text-right font-bold text-lg text-green-600">
                {/* Calculate net revenue */}
                {(
                  parseFloat(data?.revenue.total) +
                  parseFloat(data?.delivery_fees.total_collected) -
                  parseFloat(data?.discounts.total_discounts_given) -
                  parseFloat(data?.refunds.total_refunded)
                ).toFixed(2)}{' '}
                EGP
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Profit Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Gross Profit"
          value={`${data?.profit.gross_profit} EGP`}
          subtitle={`${data?.profit.gross_margin_percentage}% margin`}
        />
        <MetricCard
          title="Net Profit"
          value={`${data?.profit.net_profit} EGP`}
          subtitle={`${data?.profit.net_margin_percentage}% margin`}
        />
        <MetricCard
          title="Total Tax Collected"
          value={`${data?.taxes.total_tax_collected} EGP`}
          subtitle={`${data?.taxes.tax_rate}% tax rate`}
        />
        <MetricCard
          title="Delivery Fees"
          value={`${data?.delivery_fees.total_collected} EGP`}
          subtitle={`${data?.delivery_fees.average_fee} EGP avg`}
        />
      </div>
    </div>
  );
}
```

---

**[PART 2 CONTINUES - Let me know if you'd like me to continue with Modules 6-7, Architecture, API Specs, Security, and Deployment sections]**

This completes:
- Module 4: Customer Support (Complete)
- Module 5: Financial Management (Complete)

Remaining sections:
- Module 6: User Management & Roles
- Module 7: Analytics & Reporting
- Frontend Architecture Patterns
- Backend Architecture Patterns
- API Specifications Reference
- Complete Database Schema
- Security Implementation Guide
- Deployment & DevOps Guide
- Testing Strategy
- Appendices (Lovable Integration Guide, etc.)

Shall I continue with the final sections?
