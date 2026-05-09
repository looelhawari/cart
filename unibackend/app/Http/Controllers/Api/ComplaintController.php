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
use App\Services\PushNotificationService;
use App\Services\SmartBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComplaintController extends Controller
{
    public function __construct(
        private CloudinaryService $cloudinaryService,
        private SmartBotService $smartBotService,
        private PushNotificationService $pushNotificationService
    ) {
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
                    'bot_handled' => true,
                    'escalated_to_agent' => false,
                ]);

                if ($request->hasFile('attachments')) {
                    foreach ($request->file('attachments') as $file) {
                        // SECURITY HARDENED (audit C1):
                        //   - Verify MIME via the SERVER (Symfony guesses
                        //     from file headers), NOT from client.
                        //   - Sanitize the stored filename to prevent path-
                        //     traversal / XSS in the admin viewer.
                        //   - Whitelist only image types and pdf.
                        $serverMime = $file->getMimeType();
                        $allowedMimes = [
                            'image/jpeg' => 'image',
                            'image/png'  => 'image',
                            'image/webp' => 'image',
                            'application/pdf' => 'pdf',
                        ];

                        if (!isset($allowedMimes[$serverMime])) {
                            throw new \RuntimeException('Unsupported attachment type.');
                        }
                        $fileType = $allowedMimes[$serverMime];
                        $isImage = $fileType === 'image';

                        // Sanitize filename: strip directory traversal, control
                        // chars, HTML; cap to a safe length; preserve extension.
                        $rawName = $file->getClientOriginalName();
                        $extension = strtolower(pathinfo($rawName, PATHINFO_EXTENSION));
                        $safeStem = \Illuminate\Support\Str::slug(
                            pathinfo($rawName, PATHINFO_FILENAME),
                            '-',
                        );
                        $safeStem = $safeStem === '' ? 'attachment' : substr($safeStem, 0, 80);
                        $safeName = $safeStem . ($extension ? '.' . preg_replace('/[^a-z0-9]/', '', $extension) : '');

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
                            'file_name' => $safeName,        // sanitized
                            'file_path' => $uploadResult['url'],
                            'file_type' => $fileType,
                            'mime_type' => $serverMime,      // server-detected
                            'size_bytes' => $file->getSize(),
                            'storage_provider' => 'cloudinary',
                            'public_id' => $uploadResult['public_id'] ?? null,
                        ]);
                    }
                }

                return $complaint;
            });

            // Send bot welcome message
            $lang = $request->header('Accept-Language', 'en');
            $lang = str_contains($lang, 'ar') ? 'ar' : 'en';
            $this->smartBotService->getWelcomeMessage($complaint, $lang);

            // Send push notification confirming receipt
            $this->pushNotificationService->sendComplaintNotification(
                $user->id,
                $complaint->id,
                $complaint->ticket_number,
                'received'
            );

            return response()->json([
                'success' => true,
                'message' => __('complaint.submitted'),
                'data' => [
                    'complaint' => new ComplaintResource($complaint->load('attachments')),
                ],
            ], 201, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('complaint.create_failed'),
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
                'message' => __('complaint.not_found'),
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
                'message' => __('complaint.not_found'),
            ], 404, [], JSON_UNESCAPED_UNICODE);
        }

        if ($complaint->status === 'closed') {
            return response()->json([
                'success' => false,
                'message' => __('complaint.closed'),
            ], 422, [], JSON_UNESCAPED_UNICODE);
        }

        // Create user message
        $message = ComplaintMessage::create([
            'complaint_id' => $complaint->id,
            'user_id' => $userId,
            'message' => $request->message,
            'is_admin_reply' => false,
            'is_bot_reply' => false,
        ]);

        broadcast(new \App\Events\ComplaintMessageSent($message))->toOthers();

        // If bot is handling and not yet escalated, process through bot
        $botResponse = null;
        if ($complaint->bot_handled && !$complaint->escalated_to_agent) {
            $lang = $request->header('Accept-Language', 'en');
            $lang = str_contains($lang, 'ar') ? 'ar' : 'en';
            $botResponse = $this->smartBotService->processMessage($complaint, $request->message, $lang);
        }

        return response()->json([
            'success' => true,
            'message' => __('complaint.reply_sent'),
            'data' => [
                'bot_response' => $botResponse,
            ],
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
                'message' => __('complaint.not_found'),
            ], 404, [], JSON_UNESCAPED_UNICODE);
        }

        if ($complaint->status === 'closed') {
            return response()->json([
                'success' => true,
                'message' => __('complaint.already_closed'),
            ], 200, [], JSON_UNESCAPED_UNICODE);
        }

        $complaint->update([
            'status' => 'closed',
            'resolved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => __('complaint.closed_successfully'),
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Request escalation to human agent
     * POST /api/v1/complaints/{id}/escalate
     */
    public function escalate(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $complaint = Complaint::where('id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => __('complaint.not_found'),
            ], 404, [], JSON_UNESCAPED_UNICODE);
        }

        if ($complaint->escalated_to_agent) {
            return response()->json([
                'success' => true,
                'message' => __('complaint.already_escalated'),
            ], 200, [], JSON_UNESCAPED_UNICODE);
        }

        $complaint->update([
            'escalated_to_agent' => true,
            'escalated_at' => now(),
            'escalation_reason' => $request->reason ?? 'User requested agent',
            'status' => 'awaiting_response',
        ]);

        // Send escalation confirmation message
        $lang = $request->header('Accept-Language', 'en');
        $lang = str_contains($lang, 'ar') ? 'ar' : 'en';

        $message = $lang === 'ar'
            ? "تم تحويلك إلى موظف دعم! 🎧\n\nسيرد عليك أحد موظفينا قريباً."
            : "You've been connected to a support agent! 🎧\n\nOne of our team members will respond shortly.";

        ComplaintMessage::create([
            'complaint_id' => $complaint->id,
            'user_id' => $complaint->user_id, // Use complaint owner's ID
            'message' => $message,
            'is_admin_reply' => true,
            'is_bot_reply' => true,
            'bot_intent' => 'escalate',
        ]);

        return response()->json([
            'success' => true,
            'message' => __('complaint.escalated'),
            'data' => [
                'escalated' => true,
            ],
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Rate bot experience
     * POST /api/v1/complaints/{id}/rate-bot
     */
    public function rateBot(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'feedback' => 'nullable|string|max:500',
        ]);

        $complaint = Complaint::where('id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => __('complaint.not_found'),
            ], 404, [], JSON_UNESCAPED_UNICODE);
        }

        $complaint->update([
            'bot_satisfaction_rating' => $validated['rating'],
            'bot_feedback' => $validated['feedback'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => __('complaint.feedback_thanks'),
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
                'message' => __('complaint.not_found'),
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
