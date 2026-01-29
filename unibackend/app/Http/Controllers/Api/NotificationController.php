<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\NotificationRead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    /**
     * Get paginated notifications for the authenticated user
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $perPage = $request->input('per_page', 20);
            $type = $request->input('type'); // Filter by type

            // Get personal notifications
            $personalQuery = Notification::where('user_id', $user->id);

            // Get broadcast notifications (with read status)
            $broadcastQuery = Notification::where('is_broadcast', true)
                ->whereNull('user_id');

            if ($type) {
                $personalQuery->where('type', $type);
                $broadcastQuery->where('type', $type);
            }

            // Union personal and broadcast notifications
            $notifications = $personalQuery
                ->union($broadcastQuery)
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);

            // Get read broadcast IDs for this user
            $readBroadcastIds = NotificationRead::where('user_id', $user->id)
                ->pluck('notification_id')
                ->toArray();

            // Transform notifications
            $notifications->getCollection()->transform(function ($notification) use ($user, $readBroadcastIds) {
                $isRead = $notification->is_broadcast
                    ? in_array($notification->id, $readBroadcastIds)
                    : $notification->is_read;

                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $user->preferred_language === 'ar' && $notification->title_ar
                        ? $notification->title_ar
                        : $notification->title,
                    'message' => $user->preferred_language === 'ar' && $notification->message_ar
                        ? $notification->message_ar
                        : $notification->message,
                    'data' => $notification->data,
                    'is_read' => $isRead,
                    'is_broadcast' => $notification->is_broadcast,
                    'created_at' => $notification->created_at,
                    'time_ago' => $notification->created_at->diffForHumans(),
                ];
            });

            // Get unread count
            $unreadPersonal = Notification::where('user_id', $user->id)
                ->where('is_read', false)
                ->count();

            $unreadBroadcast = Notification::where('is_broadcast', true)
                ->whereNull('user_id')
                ->whereNotIn('id', $readBroadcastIds)
                ->count();

            return response()->json([
                'success' => true,
                'data' => $notifications,
                'unread_count' => $unreadPersonal + $unreadBroadcast,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch notifications: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch notifications',
            ], 500);
        }
    }

    /**
     * Get unread notification count
     */
    public function unreadCount(Request $request)
    {
        try {
            $user = $request->user();

            // Personal unread
            $unreadPersonal = Notification::where('user_id', $user->id)
                ->where('is_read', false)
                ->count();

            // Broadcast unread
            $readBroadcastIds = NotificationRead::where('user_id', $user->id)
                ->pluck('notification_id')
                ->toArray();

            $unreadBroadcast = Notification::where('is_broadcast', true)
                ->whereNull('user_id')
                ->whereNotIn('id', $readBroadcastIds)
                ->count();

            return response()->json([
                'success' => true,
                'unread_count' => $unreadPersonal + $unreadBroadcast,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get unread count: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get unread count',
            ], 500);
        }
    }

    /**
     * Mark a single notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        try {
            $user = $request->user();
            $notification = Notification::findOrFail($id);

            if ($notification->is_broadcast) {
                // For broadcast notifications, create a read record
                NotificationRead::firstOrCreate([
                    'user_id' => $user->id,
                    'notification_id' => $notification->id,
                ]);
            } else {
                // Verify ownership for personal notifications
                if ($notification->user_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Notification not found',
                    ], 404);
                }

                $notification->update(['is_read' => true]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Notification marked as read',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to mark notification as read: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark notification as read',
            ], 500);
        }
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        try {
            $user = $request->user();

            DB::transaction(function () use ($user) {
                // Mark all personal notifications as read
                Notification::where('user_id', $user->id)
                    ->where('is_read', false)
                    ->update(['is_read' => true]);

                // Get all broadcast notification IDs not yet read
                $readBroadcastIds = NotificationRead::where('user_id', $user->id)
                    ->pluck('notification_id')
                    ->toArray();

                $unreadBroadcasts = Notification::where('is_broadcast', true)
                    ->whereNull('user_id')
                    ->whereNotIn('id', $readBroadcastIds)
                    ->pluck('id');

                // Create read records for all unread broadcasts
                $readRecords = $unreadBroadcasts->map(function ($notificationId) use ($user) {
                    return [
                        'user_id' => $user->id,
                        'notification_id' => $notificationId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                })->toArray();

                if (!empty($readRecords)) {
                    NotificationRead::insert($readRecords);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'All notifications marked as read',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to mark all notifications as read: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark all notifications as read',
            ], 500);
        }
    }

    /**
     * Get user notification preferences
     */
    public function getPreferences(Request $request)
    {
        try {
            $user = $request->user();

            $preferences = NotificationPreference::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'push_enabled' => true,
                    'order_updates' => true,
                    'promotions' => true,
                    'wallet_updates' => true,
                    'complaint_updates' => true,
                    'quiet_hours_enabled' => false,
                    'quiet_hours_start' => '22:00',
                    'quiet_hours_end' => '08:00',
                ]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'push_enabled' => $preferences->push_enabled,
                    'order_updates' => $preferences->order_updates,
                    'promotions' => $preferences->promotions,
                    'wallet_updates' => $preferences->wallet_updates,
                    'complaint_updates' => $preferences->complaint_updates,
                    'quiet_hours_enabled' => $preferences->quiet_hours_enabled,
                    'quiet_hours_start' => $preferences->quiet_hours_start,
                    'quiet_hours_end' => $preferences->quiet_hours_end,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get notification preferences: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get notification preferences',
            ], 500);
        }
    }

    /**
     * Update user notification preferences
     */
    public function updatePreferences(Request $request)
    {
        try {
            $validated = $request->validate([
                'push_enabled' => 'sometimes|boolean',
                'order_updates' => 'sometimes|boolean',
                'promotions' => 'sometimes|boolean',
                'wallet_updates' => 'sometimes|boolean',
                'complaint_updates' => 'sometimes|boolean',
                'quiet_hours_enabled' => 'sometimes|boolean',
                'quiet_hours_start' => 'sometimes|date_format:H:i',
                'quiet_hours_end' => 'sometimes|date_format:H:i',
            ]);

            $user = $request->user();

            $preferences = NotificationPreference::updateOrCreate(
                ['user_id' => $user->id],
                $validated
            );

            return response()->json([
                'success' => true,
                'message' => 'Notification preferences updated successfully',
                'data' => [
                    'push_enabled' => $preferences->push_enabled,
                    'order_updates' => $preferences->order_updates,
                    'promotions' => $preferences->promotions,
                    'wallet_updates' => $preferences->wallet_updates,
                    'complaint_updates' => $preferences->complaint_updates,
                    'quiet_hours_enabled' => $preferences->quiet_hours_enabled,
                    'quiet_hours_start' => $preferences->quiet_hours_start,
                    'quiet_hours_end' => $preferences->quiet_hours_end,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update notification preferences: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update notification preferences',
            ], 500);
        }
    }

    /**
     * Delete a notification
     */
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();
            $notification = Notification::findOrFail($id);

            // Only allow deleting personal notifications
            if ($notification->is_broadcast) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete broadcast notifications',
                ], 403);
            }

            if ($notification->user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notification not found',
                ], 404);
            }

            $notification->delete();

            return response()->json([
                'success' => true,
                'message' => 'Notification deleted successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to delete notification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete notification',
            ], 500);
        }
    }
    /**
     * Save push notification token for user
     */
    /**
     * Save push notification token
     */
    public function saveToken(Request $request)
    {
        try {
            $validated = $request->validate([
                'token' => 'required|string',
                'device_type' => 'nullable|string|in:ios,android,web',
            ]);

            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                ], 401);
            }

            // Store token in user's push_tokens column (JSON)
            $tokens = $user->push_tokens ?? [];

            // Check if token already exists
            $existingToken = collect($tokens)->first(function ($item) use ($validated) {
                return $item['token'] === $validated['token'];
            });

            if (!$existingToken) {
                $tokens[] = [
                    'token' => $validated['token'],
                    'device_type' => $validated['device_type'] ?? 'unknown',
                    'created_at' => now()->toISOString(),
                ];

                $user->push_tokens = $tokens;
                $user->save();

                Log::info('Push token saved', [
                    'user_id' => $user->id,
                    'token' => substr($validated['token'], 0, 20) . '...',
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Push notification token saved successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to save push token: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to save notification token',
            ], 500);
        }
    }

    /**
     * Remove push notification token
     */
    /**
     * Remove push notification token
     */
    public function removeToken(Request $request)
    {
        try {
            $validated = $request->validate([
                'token' => 'required|string',
            ]);

            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                ], 401);
            }

            // Remove token from user's push_tokens
            $tokens = $user->push_tokens ?? [];
            $tokens = collect($tokens)->reject(function ($item) use ($validated) {
                return $item['token'] === $validated['token'];
            })->values()->all();

            $user->push_tokens = $tokens;
            $user->save();

            Log::info('Push token removed', [
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Push notification token removed successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to remove push token: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove notification token',
            ], 500);
        }
    }
}
