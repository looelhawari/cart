<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\TicketMessage;
use Illuminate\Http\Request;

class SupportController extends Controller
{
    public function index(Request $request)
    {
        $query = SupportTicket::query()->with(['user', 'order', 'assignedTo']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%")
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
        $ticket = SupportTicket::with([
            'user',
            'order',
            'assignedTo',
            'messages.user'
        ])->findOrFail($id);

        return response()->json($ticket);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'order_id' => 'nullable|exists:orders,id',
            'subject' => 'required|string|max:255',
            'category' => 'required|string',
            'priority' => 'required|in:low,medium,high,urgent',
            'message' => 'required|string',
        ]);

        $ticket = SupportTicket::create([
            'user_id' => $validated['user_id'],
            'order_id' => $validated['order_id'] ?? null,
            'subject' => $validated['subject'],
            'category' => $validated['category'],
            'priority' => $validated['priority'],
            'status' => 'open',
        ]);

        $ticket->messages()->create([
            'user_id' => $validated['user_id'],
            'message' => $validated['message'],
            'is_internal' => false,
        ]);

        return response()->json($ticket->load('messages'), 201);
    }

    public function update(Request $request, $id)
    {
        $ticket = SupportTicket::findOrFail($id);

        $validated = $request->validate([
            'status' => 'sometimes|in:open,in_progress,awaiting_response,resolved,closed',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        if (isset($validated['status'])) {
            if ($validated['status'] === 'resolved') {
                $validated['resolved_at'] = now();
            } elseif ($validated['status'] === 'closed') {
                $validated['closed_at'] = now();
            }
        }

        $ticket->update($validated);

        return response()->json($ticket);
    }

    public function addMessage(Request $request, $id)
    {
        $ticket = SupportTicket::findOrFail($id);

        $validated = $request->validate([
            'message' => 'required|string',
            'is_internal' => 'boolean',
        ]);

        $message = $ticket->messages()->create([
            'user_id' => auth()->id(),
            'message' => $validated['message'],
            'is_internal' => $validated['is_internal'] ?? false,
        ]);

        // Update ticket status if needed
        if ($ticket->status === 'awaiting_response') {
            $ticket->update(['status' => 'in_progress']);
        }

        return response()->json($message->load('user'), 201);
    }
}
