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
}
