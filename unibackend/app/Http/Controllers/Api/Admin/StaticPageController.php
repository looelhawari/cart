<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\StaticPage;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class StaticPageController extends Controller
{
    protected PushNotificationService $pushNotificationService;

    public function __construct(PushNotificationService $pushNotificationService)
    {
        $this->pushNotificationService = $pushNotificationService;
    }

    /**
     * Get all static pages
     */
    public function index()
    {
        try {
            $pages = StaticPage::with('updatedByUser:id,first_name,last_name,email')
                ->orderBy('slug')
                ->get()
                ->map(function ($page) {
                    return [
                        'id' => $page->id,
                        'slug' => $page->slug,
                        'title_en' => $page->title_en,
                        'title_ar' => $page->title_ar,
                        'content_en' => $page->content_en,
                        'content_ar' => $page->content_ar,
                        'is_active' => $page->is_active,
                        'last_updated_at' => $page->last_updated_at?->toISOString(),
                        'updated_by' => $page->updatedByUser ? [
                            'id' => $page->updatedByUser->id,
                            'name' => $page->updatedByUser->full_name,
                        ] : null,
                        'created_at' => $page->created_at->toISOString(),
                        'updated_at' => $page->updated_at->toISOString(),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $pages,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch static pages: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch static pages',
            ], 500);
        }
    }

    /**
     * Get a single static page by slug
     */
    public function show(string $slug)
    {
        try {
            $page = StaticPage::where('slug', $slug)->first();

            if (!$page) {
                return response()->json([
                    'success' => false,
                    'message' => 'Page not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $page->id,
                    'slug' => $page->slug,
                    'title_en' => $page->title_en,
                    'title_ar' => $page->title_ar,
                    'content_en' => $page->content_en,
                    'content_ar' => $page->content_ar,
                    'is_active' => $page->is_active,
                    'last_updated_at' => $page->last_updated_at?->toISOString(),
                    'updated_at' => $page->updated_at->toISOString(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch static page: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch page',
            ], 500);
        }
    }

    /**
     * Update a static page and optionally send broadcast notification
     */
    public function update(Request $request, string $slug)
    {
        try {
            $validator = Validator::make($request->all(), [
                'title_en' => 'required|string|max:255',
                'title_ar' => 'required|string|max:255',
                'content_en' => 'required|string',
                'content_ar' => 'required|string',
                'is_active' => 'boolean',
                'send_notification' => 'boolean',
                'notification_title_en' => 'required_if:send_notification,true|nullable|string|max:255',
                'notification_title_ar' => 'required_if:send_notification,true|nullable|string|max:255',
                'notification_message_en' => 'required_if:send_notification,true|nullable|string|max:1000',
                'notification_message_ar' => 'required_if:send_notification,true|nullable|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $page = StaticPage::where('slug', $slug)->first();

            if (!$page) {
                return response()->json([
                    'success' => false,
                    'message' => 'Page not found',
                ], 404);
            }

            $validated = $validator->validated();

            DB::beginTransaction();

            // Update the page
            $page->update([
                'title_en' => $validated['title_en'],
                'title_ar' => $validated['title_ar'],
                'content_en' => $validated['content_en'],
                'content_ar' => $validated['content_ar'],
                'is_active' => $validated['is_active'] ?? true,
                'last_updated_at' => now(),
                'updated_by' => Auth::id(),
            ]);

            // Send broadcast notification if requested
            $notificationSent = false;
            if (!empty($validated['send_notification'])) {
                $pageTypeLabels = [
                    'terms' => ['en' => 'Terms and Conditions', 'ar' => 'الشروط والأحكام'],
                    'privacy' => ['en' => 'Privacy Policy', 'ar' => 'سياسة الخصوصية'],
                    'about' => ['en' => 'About Us', 'ar' => 'من نحن'],
                ];

                $notificationTitleEn = $validated['notification_title_en'] ?? ($pageTypeLabels[$slug]['en'] . ' Updated');
                $notificationTitleAr = $validated['notification_title_ar'] ?? ('تم تحديث ' . $pageTypeLabels[$slug]['ar']);
                $notificationMessageEn = $validated['notification_message_en'] ?? 'Our ' . strtolower($pageTypeLabels[$slug]['en']) . ' has been updated. Please review the changes.';
                $notificationMessageAr = $validated['notification_message_ar'] ?? 'تم تحديث ' . $pageTypeLabels[$slug]['ar'] . '. يرجى مراجعة التغييرات.';

                // Create broadcast notification
                $notification = Notification::create([
                    'user_id' => null,
                    'type' => 'policy_update',
                    'title' => $notificationTitleEn,
                    'title_ar' => $notificationTitleAr,
                    'message' => $notificationMessageEn,
                    'message_ar' => $notificationMessageAr,
                    'data' => [
                        'action' => 'open_page',
                        'page_slug' => $slug,
                        'updated_at' => now()->toISOString(),
                    ],
                    'is_broadcast' => true,
                ]);

                // Send push notification to all users
                $this->pushNotificationService->sendBroadcast(
                    'policy_update',
                    $notificationTitleEn,
                    $notificationMessageEn,
                    [
                        'action' => 'open_page',
                        'page_slug' => $slug,
                    ],
                    $notificationTitleAr,
                    $notificationMessageAr
                );

                $notificationSent = true;

                Log::info('Static page updated with notification', [
                    'slug' => $slug,
                    'notification_id' => $notification->id,
                    'admin_id' => Auth::id(),
                ]);
            } else {
                Log::info('Static page updated without notification', [
                    'slug' => $slug,
                    'admin_id' => Auth::id(),
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Page updated successfully',
                'data' => [
                    'id' => $page->id,
                    'slug' => $page->slug,
                    'title_en' => $page->title_en,
                    'title_ar' => $page->title_ar,
                    'last_updated_at' => $page->last_updated_at->toISOString(),
                    'notification_sent' => $notificationSent,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update static page: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update page',
            ], 500);
        }
    }

    /**
     * Toggle page active status
     */
    public function toggleStatus(string $slug)
    {
        try {
            $page = StaticPage::where('slug', $slug)->first();

            if (!$page) {
                return response()->json([
                    'success' => false,
                    'message' => 'Page not found',
                ], 404);
            }

            $page->update([
                'is_active' => !$page->is_active,
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Status updated successfully',
                'data' => [
                    'slug' => $page->slug,
                    'is_active' => $page->is_active,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to toggle static page status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
            ], 500);
        }
    }

    /**
     * Get update history for a page
     */
    public function history(string $slug)
    {
        try {
            $page = StaticPage::where('slug', $slug)->first();

            if (!$page) {
                return response()->json([
                    'success' => false,
                    'message' => 'Page not found',
                ], 404);
            }

            // Get related notifications (policy updates)
            $notifications = Notification::where('type', 'policy_update')
                ->where('is_broadcast', true)
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get()
                ->filter(function ($notification) use ($slug) {
                    $data = $notification->data;
                    return is_array($data) && isset($data['page_slug']) && $data['page_slug'] === $slug;
                })
                ->take(20)
                ->map(function ($notification) {
                    return [
                        'id' => $notification->id,
                        'title_en' => $notification->title,
                        'title_ar' => $notification->title_ar,
                        'message_en' => $notification->message,
                        'message_ar' => $notification->message_ar,
                        'sent_at' => $notification->created_at->toISOString(),
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'page' => [
                        'slug' => $page->slug,
                        'last_updated_at' => $page->last_updated_at?->toISOString(),
                    ],
                    'notifications' => $notifications,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch page history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch history',
            ], 500);
        }
    }
}
