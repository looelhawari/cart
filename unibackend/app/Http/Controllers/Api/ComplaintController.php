<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Complaint\StoreComplaintReplyRequest;
use App\Http\Requests\Complaint\StoreComplaintRequest;
use App\Http\Resources\ComplaintResource;
use App\Models\Complaint;
use App\Models\ComplaintAttachment;
use App\Models\ComplaintMessage;
use App\Services\CloudinaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComplaintController extends Controller
{
    public function __construct(private CloudinaryService $cloudinaryService)
    {
    }

    /**
     * List user's complaints
     * GET /api/v1/complaints
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $perPage = (int) $request->get('per_page', 20);

        $query = Complaint::where('user_id', $userId)
            ->withCount('messages')
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $statuses = array_filter(explode(',', $request->get('status')));
            $query->whereIn('status', $statuses);
        }

        $complaints = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'complaints' => ComplaintResource::collection($complaints->items()),
                'pagination' => [
                    'current_page' => $complaints->currentPage(),
                    'per_page' => $complaints->perPage(),
                    'total' => $complaints->total(),
                    'last_page' => $complaints->lastPage(),
                ],
            ],
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Create a new complaint
     * POST /api/v1/complaints
     */
    public function store(StoreComplaintRequest $request): JsonResponse
    {
        $user = $request->user();

        try {
            $complaint = DB::transaction(function () use ($request, $user) {
                $complaint = Complaint::create([
                    'user_id' => $user->id,
                    'order_id' => $request->order_id,
                    'ticket_number' => Complaint::generateTicketNumber(),
                    'subject' => $request->subject,
                    'category' => $request->category,
                    'priority' => $request->priority ?? 'medium',
                    'status' => 'open',
                    'description' => $request->description,
                ]);

                if ($request->hasFile('attachments')) {
                    foreach ($request->file('attachments') as $file) {
                        $extension = strtolower($file->getClientOriginalExtension());
                        $isImage = in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true);
                        $fileType = $isImage ? 'image' : 'pdf';

                        $uploadResult = $this->cloudinaryService->uploadFile(
                            $file,
                            'complaints',
                            $isImage ? 'image' : 'raw'
                        );

                        if (!($uploadResult['success'] ?? false)) {
                            throw new \RuntimeException($uploadResult['error'] ?? 'Attachment upload failed');
                        }

                        ComplaintAttachment::create([
                            'complaint_id' => $complaint->id,
                            'user_id' => $user->id,
                            'file_name' => $file->getClientOriginalName(),
                            'file_path' => $uploadResult['url'],
                            'file_type' => $fileType,
                            'mime_type' => $file->getClientMimeType(),
                            'size_bytes' => $file->getSize(),
                            'storage_provider' => 'cloudinary',
                            'public_id' => $uploadResult['public_id'] ?? null,
                        ]);
                    }
                }

                return $complaint;
            });

            return response()->json([
                'success' => true,
                'message' => 'Complaint submitted successfully',
                'data' => [
                    'complaint' => new ComplaintResource($complaint->load('attachments')),
                ],
            ], 201, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create complaint',
                'error' => $e->getMessage(),
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * Get complaint details
     * GET /api/v1/complaints/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $complaint = Complaint::where('id', $id)
            ->where('user_id', $userId)
            ->with(['messages.user', 'attachments'])
            ->first();

        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => 'Complaint not found',
            ], 404, [], JSON_UNESCAPED_UNICODE);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'complaint' => new ComplaintResource($complaint),
            ],
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Add a message to a complaint
     * POST /api/v1/complaints/{id}/messages
     */
    public function addMessage(StoreComplaintReplyRequest $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $complaint = Complaint::where('id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => 'Complaint not found',
            ], 404, [], JSON_UNESCAPED_UNICODE);
        }

        if ($complaint->status === 'closed') {
            return response()->json([
                'success' => false,
                'message' => 'This complaint is closed',
            ], 422, [], JSON_UNESCAPED_UNICODE);
        }

        $message = ComplaintMessage::create([
            'complaint_id' => $complaint->id,
            'user_id' => $userId,
            'message' => $request->message,
            'is_admin_reply' => false,
        ]);

        broadcast(new \App\Events\ComplaintMessageSent($message))->toOthers();

        return response()->json([
            'success' => true,
            'message' => 'Reply sent successfully',
        ], 201, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Close a complaint
     * POST /api/v1/complaints/{id}/close
     */
    public function close(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $complaint = Complaint::where('id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => 'Complaint not found',
            ], 404, [], JSON_UNESCAPED_UNICODE);
        }

        if ($complaint->status === 'closed') {
            return response()->json([
                'success' => true,
                'message' => 'Complaint already closed',
            ], 200, [], JSON_UNESCAPED_UNICODE);
        }

        $complaint->update([
            'status' => 'closed',
            'resolved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Complaint closed successfully',
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Broadcast typing status
     * POST /api/v1/complaints/{id}/typing
     */
    public function typing(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $complaint = Complaint::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => 'Complaint not found',
            ], 404, [], JSON_UNESCAPED_UNICODE);
        }

        broadcast(new \App\Events\UserTyping(
            $complaint->id,
            $user->id,
            $user->first_name . ' ' . $user->last_name,
            $request->boolean('is_typing'),
            false // not admin
        ))->toOthers();

        return response()->json([
            'success' => true,
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}
