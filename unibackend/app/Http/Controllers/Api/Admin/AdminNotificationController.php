<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class AdminNotificationController extends Controller
{
    protected PushNotificationService $pushNotificationService;

    public function __construct(PushNotificationService $pushNotificationService)
    {
        $this->pushNotificationService = $pushNotificationService;
    }

    /**
     * Get all notifications with pagination and filters
     */
    public function index(Request $request)
    {
        try {
            $query = Notification::query();

            // Filter by type
            if ($request->has('type')) {
                $query->where('type', $request->input('type'));
            }

            // Filter by broadcast status
            if ($request->has('is_broadcast')) {
                $query->where('is_broadcast', $request->boolean('is_broadcast'));
            }

            // Filter by user
            if ($request->has('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }

            // Date range filter
            if ($request->has('from_date')) {
                $query->whereDate('created_at', '>=', $request->input('from_date'));
            }
            if ($request->has('to_date')) {
                $query->whereDate('created_at', '<=', $request->input('to_date'));
            }

            $notifications = $query->with('user:id,name,email')
                ->orderBy('created_at', 'desc')
                ->paginate($request->input('per_page', 20));

            return response()->json([
                'success' => true,
                'data' => $notifications,
            ]);

        } catch (\Exception $e) {
            Log::error('Admin: Failed to fetch notifications: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch notifications',
            ], 500);
        }
    }

    /**
     * Send a broadcast notification to all users
     */
    public function sendBroadcast(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'title_ar' => 'required|string|max:255',
                'message' => 'required|string|max:1000',
                'message_ar' => 'required|string|max:1000',
                'data' => 'nullable|array',
                'data.action' => 'nullable|string',
                'data.action_id' => 'nullable|string',
                'schedule_at' => 'nullable|date|after:now',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $validated = $validator->validated();

            // Create broadcast notification
            $notification = Notification::create([
                'user_id' => null, // Broadcast = no specific user
                'type' => 'broadcast',
                'title' => $validated['title'],
                'title_ar' => $validated['title_ar'],
                'message' => $validated['message'],
                'message_ar' => $validated['message_ar'],
                'data' => $validated['data'] ?? null,
                'is_broadcast' => true,
                'scheduled_at' => $validated['schedule_at'] ?? null,
            ]);

            // Count target users
            $targetCount = User::whereNotNull('push_tokens')
                ->where('push_tokens', '!=', '[]')
                ->count();

            // Dispatch broadcast job (will handle chunking and quiet hours)
            if (empty($validated['schedule_at'])) {
                $this->pushNotificationService->sendBroadcast(
                    'broadcast',
                    $validated['title'],
                    $validated['message'],
                    $validated['data'] ?? [],
                    $validated['title_ar'],
                    $validated['message_ar']
                );
            }

            Log::info('Admin: Broadcast notification created', [
                'notification_id' => $notification->id,
                'target_users' => $targetCount,
                'scheduled' => $validated['schedule_at'] ?? 'immediate',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Broadcast notification created successfully',
                'data' => [
                    'notification_id' => $notification->id,
                    'target_users' => $targetCount,
                    'scheduled_at' => $validated['schedule_at'] ?? null,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Admin: Failed to send broadcast: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to send broadcast notification',
            ], 500);
        }
    }

    /**
     * Send notification to specific user(s)
     */
    public function sendToUsers(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'user_ids' => 'required|array|min:1',
                'user_ids.*' => 'exists:users,id',
                'title' => 'required|string|max:255',
                'title_ar' => 'required|string|max:255',
                'message' => 'required|string|max:1000',
                'message_ar' => 'required|string|max:1000',
                'type' => 'required|string|in:promotion,announcement,custom',
                'data' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $validated = $validator->validated();
            $sentCount = 0;
            $failedCount = 0;

            foreach ($validated['user_ids'] as $userId) {
                try {
                    $this->pushNotificationService->sendToUser(
                        $userId,
                        $validated['type'],
                        $validated['title'],
                        $validated['message'],
                        $validated['data'] ?? [],
                        $validated['title_ar'],
                        $validated['message_ar']
                    );
                    $sentCount++;
                } catch (\Exception $e) {
                    Log::error("Failed to send to user {$userId}: " . $e->getMessage());
                    $failedCount++;
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Notifications sent to {$sentCount} users",
                'data' => [
                    'sent' => $sentCount,
                    'failed' => $failedCount,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Admin: Failed to send to users: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to send notifications',
            ], 500);
        }
    }

    /**
     * Send promotion notification
     */
    public function sendPromotion(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'promotion_id' => 'required|exists:promotions,id',
                'title' => 'required|string|max:255',
                'title_ar' => 'required|string|max:255',
                'message' => 'required|string|max:1000',
                'message_ar' => 'required|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $validated = $validator->validated();

            // Create notification record
            $notification = Notification::create([
                'user_id' => null,
                'type' => 'promotion',
                'title' => $validated['title'],
                'title_ar' => $validated['title_ar'],
                'message' => $validated['message'],
                'message_ar' => $validated['message_ar'],
                'data' => [
                    'action' => 'open_promotion',
                    'promotion_id' => $validated['promotion_id'],
                ],
                'is_broadcast' => true,
            ]);

            // Get target count
            $targetCount = User::whereNotNull('push_tokens')
                ->where('push_tokens', '!=', '[]')
                ->count();

            // Send broadcast
            $this->pushNotificationService->sendBroadcast(
                'promotion',
                $validated['title'],
                $validated['message'],
                [
                    'action' => 'open_promotion',
                    'promotion_id' => $validated['promotion_id'],
                ],
                $validated['title_ar'],
                $validated['message_ar']
            );

            return response()->json([
                'success' => true,
                'message' => 'Promotion notification sent',
                'data' => [
                    'notification_id' => $notification->id,
                    'target_users' => $targetCount,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Admin: Failed to send promotion notification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to send promotion notification',
            ], 500);
        }
    }

    /**
     * Get notification analytics/statistics
     */
    public function analytics(Request $request)
    {
        try {
            $fromDate = $request->input('from_date', now()->subDays(30)->toDateString());
            $toDate = $request->input('to_date', now()->toDateString());

            // Total notifications by type
            $byType = Notification::select('type', DB::raw('COUNT(*) as count'))
                ->whereBetween('created_at', [$fromDate, $toDate])
                ->groupBy('type')
                ->get();

            // Delivery statistics
            $deliveryStats = NotificationDelivery::select(
                'push_status',
                DB::raw('COUNT(*) as count')
            )
                ->whereBetween('created_at', [$fromDate, $toDate])
                ->groupBy('push_status')
                ->get();

            // Daily notification counts
            $dailyStats = Notification::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as count'),
                DB::raw("SUM(CASE WHEN is_broadcast = 1 THEN 1 ELSE 0 END) as broadcasts"),
                DB::raw("SUM(CASE WHEN is_broadcast = 0 THEN 1 ELSE 0 END) as personal")
            )
                ->whereBetween('created_at', [$fromDate, $toDate])
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('date')
                ->get();

            // Users with push enabled
            $usersWithPush = User::whereNotNull('push_tokens')
                ->where('push_tokens', '!=', '[]')
                ->count();

            $totalUsers = User::count();

            // Recent broadcasts performance
            $recentBroadcasts = Notification::where('is_broadcast', true)
                ->with(['deliveries' => function ($query) {
                    $query->select('notification_id', 'push_status', DB::raw('COUNT(*) as count'))
                        ->groupBy('notification_id', 'push_status');
                }])
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($notification) {
                    $deliveryCounts = $notification->deliveries->pluck('count', 'push_status');
                    return [
                        'id' => $notification->id,
                        'title' => $notification->title,
                        'created_at' => $notification->created_at,
                        'sent' => $deliveryCounts->get('sent', 0),
                        'delivered' => $deliveryCounts->get('delivered', 0),
                        'failed' => $deliveryCounts->get('failed', 0),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'period' => [
                        'from' => $fromDate,
                        'to' => $toDate,
                    ],
                    'summary' => [
                        'total_notifications' => Notification::whereBetween('created_at', [$fromDate, $toDate])->count(),
                        'total_broadcasts' => Notification::where('is_broadcast', true)
                            ->whereBetween('created_at', [$fromDate, $toDate])->count(),
                        'users_with_push' => $usersWithPush,
                        'total_users' => $totalUsers,
                        'push_adoption_rate' => $totalUsers > 0
                            ? round(($usersWithPush / $totalUsers) * 100, 2)
                            : 0,
                    ],
                    'by_type' => $byType,
                    'delivery_stats' => $deliveryStats,
                    'daily_stats' => $dailyStats,
                    'recent_broadcasts' => $recentBroadcasts,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Admin: Failed to get notification analytics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get analytics',
            ], 500);
        }
    }

    /**
     * Get details of a specific notification including delivery stats
     */
    public function show($id)
    {
        try {
            $notification = Notification::with([
                'user:id,name,email',
                'deliveries' => function ($query) {
                    $query->with('user:id,name,email')
                        ->orderBy('created_at', 'desc')
                        ->limit(100);
                },
            ])->findOrFail($id);

            // Get delivery statistics
            $deliveryStats = NotificationDelivery::where('notification_id', $id)
                ->select('push_status', DB::raw('COUNT(*) as count'))
                ->groupBy('push_status')
                ->get()
                ->pluck('count', 'push_status');

            return response()->json([
                'success' => true,
                'data' => [
                    'notification' => $notification,
                    'delivery_summary' => [
                        'pending' => $deliveryStats->get('pending', 0),
                        'sent' => $deliveryStats->get('sent', 0),
                        'delivered' => $deliveryStats->get('delivered', 0),
                        'failed' => $deliveryStats->get('failed', 0),
                        'total' => $deliveryStats->sum(),
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Admin: Failed to get notification details: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Notification not found',
            ], 404);
        }
    }

    /**
     * Delete a notification
     */
    public function destroy($id)
    {
        try {
            $notification = Notification::findOrFail($id);

            // Delete related deliveries and reads
            NotificationDelivery::where('notification_id', $id)->delete();

            $notification->delete();

            Log::info('Admin: Notification deleted', ['notification_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Notification deleted successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Admin: Failed to delete notification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete notification',
            ], 500);
        }
    }

    /**
     * Resend a failed notification
     */
    public function resend($id)
    {
        try {
            $notification = Notification::findOrFail($id);

            if ($notification->is_broadcast) {
                // Re-dispatch broadcast
                $this->pushNotificationService->sendBroadcast(
                    $notification->type,
                    $notification->title,
                    $notification->message,
                    $notification->data ?? [],
                    $notification->title_ar,
                    $notification->message_ar
                );
            } else {
                // Resend to specific user
                if ($notification->user_id) {
                    $this->pushNotificationService->sendToUser(
                        $notification->user_id,
                        $notification->type,
                        $notification->title,
                        $notification->message,
                        $notification->data ?? [],
                        $notification->title_ar,
                        $notification->message_ar
                    );
                }
            }

            Log::info('Admin: Notification resent', ['notification_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Notification resent successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Admin: Failed to resend notification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to resend notification',
            ], 500);
        }
    }
}
