<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupportController extends Controller
{
    public function index(Request $request)
    {
        $query = Complaint::query()->with(['user', 'order', 'assignedTo']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                    ->orWhere('ticket_number', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            if (is_array($request->status)) {
                $query->whereIn('status', $request->status);
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('priority')) {
            if (is_array($request->priority)) {
                $query->whereIn('priority', $request->priority);
            } else {
                $query->where('priority', $request->priority);
            }
        }

        if ($request->filled('assigned_to')) {
            if ($request->assigned_to === 'unassigned') {
                $query->whereNull('assigned_to');
            } elseif ($request->assigned_to === 'me') {
                $query->where('assigned_to', auth()->id());
            } else {
                $query->where('assigned_to', $request->assigned_to);
            }
        }

        $tickets = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($tickets);
    }

    public function show($id)
    {
        $ticket = Complaint::with([
            'user',
            'order',
            'assignedTo',
            'messages.user',
            'attachments'
        ])->findOrFail($id);

        return response()->json($ticket);
    }

    public function store(Request $request)
    {
        // Admin creating a ticket on behalf of user
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'order_id' => 'nullable|exists:orders,id',
            'subject' => 'required|string|max:255',
            'category' => 'required|string',
            'priority' => 'required|in:low,medium,high,urgent',
            'message' => 'required|string',
        ]);

        $ticket = Complaint::create([
            'user_id' => $validated['user_id'],
            'order_id' => $validated['order_id'] ?? null,
            'ticket_number' => Complaint::generateTicketNumber(),
            'subject' => $validated['subject'],
            'category' => $validated['category'],
            'priority' => $validated['priority'],
            'status' => 'open',
            'description' => $validated['message'], // Use initial message as description for admin-created tickets
            'assigned_to' => auth()->id(),
        ]);

        // Create initial message entry as well for consistency
        /* 
        $ticket->messages()->create([
            'user_id' => auth()->id(), // Admin created it
            'message' => $validated['message'],
            'is_admin_reply' => true,
        ]);
        */

        return response()->json($ticket->load('messages'), 201);
    }

    public function update(Request $request, $id)
    {
        $ticket = Complaint::findOrFail($id);

        $validated = $request->validate([
            'status' => 'sometimes|in:open,in_progress,awaiting_response,resolved,closed',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        if (isset($validated['status'])) {
            if ($validated['status'] === 'resolved') {
                $validated['resolved_at'] = now();
                $validated['resolved_by'] = auth()->id();
            } elseif ($validated['status'] === 'closed' && !$ticket->resolved_at) {
                // If closing without resolving, mark resolved now? Or kept separate?
                // Let's keep closed separate but typically closed implies finished.
            }
        }

        $ticket->update($validated);

        return response()->json($ticket->load(['assignedTo']));
    }

    /**
     * Update ticket status only
     */
    public function updateStatus(Request $request, $id)
    {
        $ticket = Complaint::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:open,in_progress,awaiting_response,resolved,closed',
        ]);

        if ($validated['status'] === 'resolved') {
            $ticket->resolved_at = now();
            $ticket->resolved_by = auth()->id();
        }

        $ticket->status = $validated['status'];
        $ticket->save();

        return response()->json($ticket);
    }

    /**
     * Update ticket priority only
     */
    public function updatePriority(Request $request, $id)
    {
        $ticket = Complaint::findOrFail($id);

        $validated = $request->validate([
            'priority' => 'required|in:low,medium,high,urgent',
        ]);

        $ticket->priority = $validated['priority'];
        $ticket->save();

        return response()->json($ticket);
    }

    /**
     * Assign ticket to a user (0 = assign to self)
     */
    public function assignTicket(Request $request, $id)
    {
        $ticket = Complaint::findOrFail($id);

        $validated = $request->validate([
            'assigned_to' => 'required',
        ]);

        // If 0 is passed, assign to current user
        $assignTo = $validated['assigned_to'] == 0 ? auth()->id() : $validated['assigned_to'];
        
        $ticket->assigned_to = $assignTo;
        $ticket->save();

        return response()->json($ticket->load('assignedTo'));
    }

    public function addMessage(Request $request, $id)
    {
        $ticket = Complaint::findOrFail($id);

        $validated = $request->validate([
            'message' => 'required|string',
            'is_internal' => 'boolean', // Not in ComplaintMessage yet, assuming public for now or we add is_internal
        ]);

        $message = $ticket->messages()->create([
            'user_id' => auth()->id(),
            'message' => $validated['message'],
            'is_admin_reply' => true,
        ]);

        // Update ticket status
        if ($ticket->status === 'open' || $ticket->status === 'awaiting_response') {
            $ticket->update(['status' => 'in_progress']);
        }
        
        broadcast(new \App\Events\ComplaintMessageSent($message))->toOthers();

        return response()->json($message->load('user'), 201);
    }

    /**
     * Broadcast typing status
     */
    public function typing(Request $request, $id)
    {
        $ticket = Complaint::findOrFail($id);
        $user = auth()->user();

        broadcast(new \App\Events\UserTyping(
            $ticket->id,
            $user->id,
            $user->first_name . ' ' . $user->last_name,
            $request->boolean('is_typing'),
            true // is_admin
        ))->toOthers();

        return response()->json(['status' => 'ok']);
    }

    /**
     * Get support analytics and metrics
     */
    public function analytics(Request $request)
    {
        $period = $request->get('period', '7d');
        $startDate = match($period) {
            '24h' => now()->subDay(),
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            '90d' => now()->subDays(90),
            default => now()->subDays(7),
        };

        // Total tickets count by status
        $ticketsByStatus = Complaint::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Tickets created in period
        $newTickets = Complaint::where('created_at', '>=', $startDate)->count();
        
        // Tickets resolved in period
        $resolvedTickets = Complaint::where('resolved_at', '>=', $startDate)->count();

        // Average response time (first admin reply)
        $avgResponseTime = DB::table('complaints as c')
            ->join('complaint_messages as m', function($join) {
                $join->on('c.id', '=', 'm.complaint_id')
                     ->where('m.is_admin_reply', true);
            })
            ->where('c.created_at', '>=', $startDate)
            ->select(DB::raw('AVG(TIMESTAMPDIFF(MINUTE, c.created_at, m.created_at)) as avg_minutes'))
            ->groupBy('c.id')
            ->get()
            ->avg('avg_minutes') ?? 0;

        // Average resolution time
        $avgResolutionTime = Complaint::whereNotNull('resolved_at')
            ->where('created_at', '>=', $startDate)
            ->select(DB::raw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours'))
            ->first()
            ->avg_hours ?? 0;

        // Tickets by priority
        $ticketsByPriority = Complaint::select('priority', DB::raw('count(*) as count'))
            ->groupBy('priority')
            ->pluck('count', 'priority')
            ->toArray();

        // Tickets by category
        $ticketsByCategory = Complaint::select('category', DB::raw('count(*) as count'))
            ->groupBy('category')
            ->orderByDesc('count')
            ->limit(10)
            ->pluck('count', 'category')
            ->toArray();

        // Daily ticket trend
        $dailyTrend = Complaint::where('created_at', '>=', $startDate)
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date')
            ->toArray();

        // Top performers (agents with most resolved tickets)
        $topPerformers = Complaint::whereNotNull('resolved_by')
            ->where('resolved_at', '>=', $startDate)
            ->join('users', 'complaints.resolved_by', '=', 'users.id')
            ->select('users.id', 'users.first_name', 'users.last_name', DB::raw('count(*) as resolved_count'))
            ->groupBy('users.id', 'users.first_name', 'users.last_name')
            ->orderByDesc('resolved_count')
            ->limit(5)
            ->get();

        // Unread messages count
        $unreadCount = ComplaintMessage::where('is_admin_reply', false)
            ->where('is_read', false)
            ->count();

        // Open urgent tickets
        $urgentOpen = Complaint::where('status', 'open')
            ->where('priority', 'urgent')
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'overview' => [
                    'total_open' => $ticketsByStatus['open'] ?? 0,
                    'total_in_progress' => $ticketsByStatus['in_progress'] ?? 0,
                    'total_awaiting' => $ticketsByStatus['awaiting_response'] ?? 0,
                    'total_resolved' => $ticketsByStatus['resolved'] ?? 0,
                    'total_closed' => $ticketsByStatus['closed'] ?? 0,
                    'new_tickets' => $newTickets,
                    'resolved_tickets' => $resolvedTickets,
                    'unread_messages' => $unreadCount,
                    'urgent_open' => $urgentOpen,
                ],
                'performance' => [
                    'avg_response_time_minutes' => round($avgResponseTime, 1),
                    'avg_resolution_time_hours' => round($avgResolutionTime, 1),
                    'resolution_rate' => $newTickets > 0 ? round(($resolvedTickets / $newTickets) * 100, 1) : 0,
                ],
                'tickets_by_priority' => $ticketsByPriority,
                'tickets_by_category' => $ticketsByCategory,
                'daily_trend' => $dailyTrend,
                'top_performers' => $topPerformers,
            ],
        ]);
    }

    /**
     * Get smart reply suggestions based on ticket content
     */
    public function getSuggestions(Request $request, $id)
    {
        $ticket = Complaint::with(['messages'])->findOrFail($id);
        
        $suggestions = $this->generateSmartSuggestions($ticket);

        return response()->json([
            'success' => true,
            'data' => ['suggestions' => $suggestions],
        ]);
    }

    /**
     * Generate smart suggestions based on ticket category and content
     */
    private function generateSmartSuggestions(Complaint $ticket): array
    {
        $suggestions = [];
        
        // Category-based suggestions
        $categorySuggestions = [
            'order_issue' => [
                ['title' => 'Order Status Update', 'message' => "I've checked your order #{order_id} and can confirm it's currently being processed. You should receive it within 24-48 hours. Is there anything specific you'd like to know about your order?"],
                ['title' => 'Apologize for Delay', 'message' => "I sincerely apologize for the delay with your order. We're working to resolve this as quickly as possible. As a gesture of goodwill, we'd like to offer you a discount on your next purchase."],
                ['title' => 'Order Cancellation', 'message' => "I've processed your cancellation request and your refund will be initiated within 3-5 business days. Is there anything else I can help you with?"],
            ],
            'product_quality' => [
                ['title' => 'Quality Concern', 'message' => "Thank you for bringing this to our attention. We take product quality very seriously. Could you please provide more details or photos of the issue so we can investigate and make it right?"],
                ['title' => 'Replacement Offer', 'message' => "We're sorry to hear about the quality issue. We'd like to send you a replacement at no extra cost. Please confirm your delivery address and we'll dispatch it immediately."],
                ['title' => 'Refund for Quality', 'message' => "We apologize for the inconvenience. A full refund has been processed to your original payment method. Please allow 3-5 business days for it to reflect."],
            ],
            'delivery_problem' => [
                ['title' => 'Delivery Status', 'message' => "I've tracked your package and it shows [status]. The estimated delivery is [date]. If you have any concerns, please let me know."],
                ['title' => 'Missing Delivery', 'message' => "I'm sorry your order hasn't arrived. I've escalated this to our delivery team and will update you within 24 hours. In the meantime, I've also checked with neighbors and our delivery partner."],
                ['title' => 'Redelivery', 'message' => "I've scheduled a redelivery for your order. Please ensure someone is available at the delivery address. You'll receive an SMS notification 30 minutes before delivery."],
            ],
            'payment_issue' => [
                ['title' => 'Payment Confirmation', 'message' => "I can confirm your payment was successfully processed. Your order is now being prepared. You should receive a confirmation email shortly."],
                ['title' => 'Refund Status', 'message' => "Your refund of [amount] has been processed and should appear in your account within 3-5 business days depending on your bank."],
                ['title' => 'Payment Failed', 'message' => "It looks like there was an issue with your payment. This could be due to insufficient funds or card restrictions. Please try again or use an alternative payment method."],
            ],
            'technical_issue' => [
                ['title' => 'App Troubleshooting', 'message' => "I'm sorry you're experiencing technical difficulties. Could you try clearing the app cache and restarting? If the issue persists, please let me know your device model and app version."],
                ['title' => 'Account Access', 'message' => "I've reset your account access. Please try logging in again with your email. If you continue to have issues, please use the 'Forgot Password' option."],
            ],
            'general_inquiry' => [
                ['title' => 'General Response', 'message' => "Thank you for reaching out! I'm happy to help you with your inquiry. Could you please provide more details so I can assist you better?"],
                ['title' => 'Information Provided', 'message' => "Here's the information you requested: [details]. If you have any more questions, feel free to ask!"],
            ],
        ];

        // Get category-specific suggestions
        if (isset($categorySuggestions[$ticket->category])) {
            $suggestions = array_merge($suggestions, $categorySuggestions[$ticket->category]);
        }

        // Add general suggestions
        $suggestions[] = ['title' => 'Thank Customer', 'message' => "Thank you for your patience and for being a valued customer. If there's anything else I can help you with, please don't hesitate to ask!"];
        $suggestions[] = ['title' => 'Follow Up', 'message' => "I'm following up on your previous inquiry. Has everything been resolved to your satisfaction? Please let me know if you need any further assistance."];
        $suggestions[] = ['title' => 'Escalation Notice', 'message' => "I've escalated this to our senior team for further review. You'll hear back from us within 24 hours. Thank you for your patience."];

        // Replace placeholders with actual data
        foreach ($suggestions as &$suggestion) {
            if ($ticket->order_id) {
                $suggestion['message'] = str_replace('{order_id}', $ticket->order_id, $suggestion['message']);
            }
        }

        return $suggestions;
    }

    /**
     * Mark messages as read
     */
    public function markAsRead(Request $request, $id)
    {
        ComplaintMessage::where('complaint_id', $id)
            ->where('is_admin_reply', false)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['success' => true]);
    }

    /**
     * Get customer ticket history
     */
    public function getCustomerHistory($ticketId)
    {
        $ticket = Complaint::findOrFail($ticketId);
        
        $history = Complaint::where('user_id', $ticket->user_id)
            ->where('id', '!=', $ticketId)
            ->with(['messages' => function($q) {
                $q->latest()->limit(1);
            }])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $stats = [
            'total_tickets' => Complaint::where('user_id', $ticket->user_id)->count(),
            'resolved_tickets' => Complaint::where('user_id', $ticket->user_id)->where('status', 'resolved')->count(),
            'avg_messages' => round(Complaint::where('user_id', $ticket->user_id)->withCount('messages')->get()->avg('messages_count'), 1),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'history' => $history,
                'stats' => $stats,
            ],
        ]);
    }
}
