<?php

namespace App\Services;

use App\Jobs\ProcessBroadcastNotification;
use App\Jobs\SendOrderNotification;
use App\Jobs\SendDelayedNotification;
use App\Models\Notification;
use App\Models\NotificationDelivery;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    private const EXPO_API_URL = 'https://exp.host/--/api/v2/push/send';
    private const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
    private const EXPO_BATCH_SIZE = 100;

    /**
     * Send notification to a single user (synchronous for immediate notifications).
     */
    public function sendToUser(
        int $userId,
        string $type,
        string $title,
        string $message,
        array $data = [],
        ?string $titleAr = null,
        ?string $messageAr = null,
        ?string $actionTarget = null,
        ?string $imageUrl = null
    ): ?Notification {
        $user = User::find($userId);
        if (!$user) {
            Log::warning('PushNotification: User not found', ['user_id' => $userId]);
            return null;
        }

        // Check notification preferences
        $preferences = NotificationPreference::getOrCreateForUser($userId);
        if (!$preferences->shouldReceive($type)) {
            Log::info('PushNotification: User opted out', [
                'user_id' => $userId,
                'type' => $type,
            ]);
            // Still create the notification for in-app viewing, just don't push
            return $this->createNotificationRecord(
                $userId,
                $type,
                $title,
                $message,
                $data,
                $titleAr,
                $messageAr,
                $actionTarget,
                $imageUrl,
                false,
                'skipped'
            );
        }

        // Check quiet hours
        $quietCheck = $preferences->shouldSendNow();
        if (!$quietCheck['send']) {
            // Create notification and schedule delayed push
            $notification = $this->createNotificationRecord(
                $userId,
                $type,
                $title,
                $message,
                $data,
                $titleAr,
                $messageAr,
                $actionTarget,
                $imageUrl,
                false,
                'scheduled'
            );

            SendDelayedNotification::dispatch($notification->id, $userId)
                ->delay($quietCheck['delay_until']);

            return $notification;
        }

        // Create notification record
        $notification = $this->createNotificationRecord(
            $userId,
            $type,
            $title,
            $message,
            $data,
            $titleAr,
            $messageAr,
            $actionTarget,
            $imageUrl,
            false,
            'pending'
        );

        // Send push notification
        $this->dispatchPushToUser($notification, $user);

        return $notification;
    }

    /**
     * Send broadcast notification to all users (queued for scalability).
     */
    public function sendBroadcast(
        string $type,
        string $title,
        string $message,
        array $data = [],
        ?string $titleAr = null,
        ?string $messageAr = null,
        ?string $actionTarget = null,
        ?string $imageUrl = null
    ): Notification {
        // Create broadcast notification record first
        $notification = $this->createNotificationRecord(
            null,
            $type,
            $title,
            $message,
            $data,
            $titleAr,
            $messageAr,
            $actionTarget,
            $imageUrl,
            true,
            'queued'
        );

        // Dispatch the broadcast job (handles chunking internally)
        ProcessBroadcastNotification::dispatch($notification->id);

        Log::info('Broadcast notification queued', [
            'notification_id' => $notification->id,
            'type' => $type,
        ]);

        return $notification;
    }

    /**
     * Create a notification record in the database.
     */
    private function createNotificationRecord(
        ?int $userId,
        string $type,
        string $title,
        string $message,
        array $data,
        ?string $titleAr,
        ?string $messageAr,
        ?string $actionTarget,
        ?string $imageUrl,
        bool $isBroadcast,
        string $pushStatus
    ): Notification {
        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'title_ar' => $titleAr,
            'message' => $message,
            'message_ar' => $messageAr,
            'data' => $data,
            'action_type' => $actionTarget ? 'navigate' : null,
            'action_target' => $actionTarget,
            'image_url' => $imageUrl,
            'is_broadcast' => $isBroadcast,
            'push_status' => $pushStatus,
        ]);
    }

    /**
     * Dispatch push notification to a single user.
     */
    public function dispatchPushToUser(Notification $notification, User $user): bool
    {
        $tokens = $user->push_tokens ?? [];

        if (empty($tokens)) {
            Log::info('PushNotification: No tokens for user', ['user_id' => $user->id]);
            return false;
        }

        // Determine title and message based on user language
        $language = $user->language ?? 'en';
        $title = $notification->getLocalizedTitle($language);
        $message = $notification->getLocalizedMessage($language);

        $messages = [];
        $deliveryRecords = [];

        foreach ($tokens as $tokenData) {
            $pushToken = $tokenData['token'] ?? null;

            if (!$pushToken) {
                continue;
            }

            // Validate Expo push token format
            if (!str_starts_with($pushToken, 'ExponentPushToken[')) {
                Log::warning('PushNotification: Invalid token format', [
                    'token' => substr($pushToken, 0, 30) . '...',
                    'user_id' => $user->id,
                ]);
                continue;
            }

            $messages[] = [
                'to' => $pushToken,
                'sound' => 'default',
                'title' => $title,
                'body' => $message,
                'data' => array_merge($notification->data ?? [], [
                    'notificationId' => $notification->id,
                    'type' => $notification->type,
                    'actionTarget' => $notification->action_target,
                ]),
                'priority' => 'high',
                'channelId' => $this->getChannelId($notification->type),
            ];

            $deliveryRecords[] = [
                'notification_id' => $notification->id,
                'user_id' => $user->id,
                'device_token' => $pushToken,
                'platform' => $tokenData['device_type'] ?? 'unknown',
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (empty($messages)) {
            return false;
        }

        // Insert delivery records
        NotificationDelivery::insert($deliveryRecords);

        // Send to Expo Push API
        try {
            $response = Http::timeout(30)
                ->retry(3, 100)
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Accept-Encoding' => 'gzip, deflate',
                    'Content-Type' => 'application/json',
                ])
                ->post(self::EXPO_API_URL, $messages);

            if ($response->successful()) {
                $notification->update([
                    'push_status' => 'sent',
                    'sent_at' => now(),
                ]);

                // Update delivery records with ticket IDs
                $responseData = $response->json('data', []);
                $this->updateDeliveryTickets($notification->id, $user->id, $responseData);

                Log::info('PushNotification: Sent successfully', [
                    'notification_id' => $notification->id,
                    'user_id' => $user->id,
                    'tokens_count' => count($messages),
                ]);

                return true;
            } else {
                $notification->update([
                    'push_status' => 'failed',
                    'push_error' => $response->body(),
                ]);

                Log::error('PushNotification: Failed to send', [
                    'notification_id' => $notification->id,
                    'response' => $response->body(),
                ]);

                return false;
            }
        } catch (\Exception $e) {
            $notification->update([
                'push_status' => 'failed',
                'push_error' => $e->getMessage(),
            ]);

            Log::error('PushNotification: Exception', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Send messages in batch to Expo API (for broadcasts).
     */
    public function sendBatch(array $messages): array
    {
        if (empty($messages)) {
            return ['success' => false, 'tickets' => []];
        }

        $ticketIds = [];
        $batches = array_chunk($messages, self::EXPO_BATCH_SIZE);

        foreach ($batches as $index => $batch) {
            try {
                $response = Http::timeout(30)
                    ->retry(3, 100)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Accept-Encoding' => 'gzip, deflate',
                        'Content-Type' => 'application/json',
                    ])
                    ->post(self::EXPO_API_URL, $batch);

                if ($response->successful()) {
                    $data = $response->json('data', []);
                    foreach ($data as $ticket) {
                        if (isset($ticket['id'])) {
                            $ticketIds[] = $ticket['id'];
                        }
                    }
                } else {
                    Log::error('PushNotification: Batch failed', [
                        'batch_index' => $index,
                        'response' => $response->body(),
                    ]);
                }

                // Rate limiting: small delay between batches
                if ($index < count($batches) - 1) {
                    usleep(100000); // 100ms delay
                }
            } catch (\Exception $e) {
                Log::error('PushNotification: Batch exception', [
                    'batch_index' => $index,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'success' => !empty($ticketIds),
            'tickets' => $ticketIds,
            'sent_count' => count($ticketIds),
            'total_messages' => count($messages),
        ];
    }

    /**
     * Check push notification receipts.
     */
    public function checkReceipts(array $ticketIds): array
    {
        if (empty($ticketIds)) {
            return [];
        }

        $results = [];
        $batches = array_chunk($ticketIds, 1000);

        foreach ($batches as $batch) {
            try {
                $response = Http::timeout(30)
                    ->post(self::EXPO_RECEIPTS_URL, ['ids' => $batch]);

                if ($response->successful()) {
                    $receipts = $response->json('data', []);
                    $results = array_merge($results, $receipts);
                }
            } catch (\Exception $e) {
                Log::error('PushNotification: Receipt check failed', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $results;
    }

    /**
     * Update delivery records with ticket IDs.
     */
    private function updateDeliveryTickets(int $notificationId, int $userId, array $responseData): void
    {
        $deliveries = NotificationDelivery::where('notification_id', $notificationId)
            ->where('user_id', $userId)
            ->where('status', 'pending')
            ->get();

        foreach ($deliveries as $index => $delivery) {
            if (isset($responseData[$index])) {
                $ticketData = $responseData[$index];
                if ($ticketData['status'] === 'ok' && isset($ticketData['id'])) {
                    $delivery->markAsSent($ticketData['id']);
                } elseif ($ticketData['status'] === 'error') {
                    $delivery->markAsFailed($ticketData['message'] ?? 'Unknown error');
                }
            }
        }
    }

    /**
     * Get Android notification channel ID.
     */
    public function getChannelId(string $type): string
    {
        return match ($type) {
            'order' => 'orders',
            'promo', 'promotion' => 'promotions',
            'wallet' => 'wallet',
            'support', 'complaint' => 'support',
            default => 'default',
        };
    }

    // ==================== NOTIFICATION TEMPLATES ====================

    /**
     * Send order status notification.
     */
    public function sendOrderStatusNotification(
        int $userId,
        string $orderId,
        string $orderNumber,
        string $status,
        ?string $reason = null
    ): ?Notification {
        $templates = [
            'pending' => [
                'title' => '⏳ Order Pending',
                'title_ar' => '⏳ طلب قيد الانتظار',
                'message' => "Your order #{$orderNumber} is being processed",
                'message_ar' => "طلبك رقم #{$orderNumber} قيد المعالجة",
            ],
            'pending_payment' => [
                'title' => '💳 Payment Required',
                'title_ar' => '💳 الدفع مطلوب',
                'message' => "Complete payment for order #{$orderNumber}",
                'message_ar' => "أكمل الدفع للطلب رقم #{$orderNumber}",
            ],
            'confirmed' => [
                'title' => '✅ Order Confirmed',
                'title_ar' => '✅ تم تأكيد الطلب',
                'message' => "Your order #{$orderNumber} has been confirmed!",
                'message_ar' => "تم تأكيد طلبك رقم #{$orderNumber}!",
            ],
            'preparing' => [
                'title' => '👨‍🍳 Preparing Your Order',
                'title_ar' => '👨‍🍳 جاري تحضير طلبك',
                'message' => "Your order #{$orderNumber} is being prepared",
                'message_ar' => "جاري تحضير طلبك رقم #{$orderNumber}",
            ],
            'out_for_delivery' => [
                'title' => '🚚 On The Way!',
                'title_ar' => '🚚 في الطريق إليك!',
                'message' => "Your order #{$orderNumber} is out for delivery",
                'message_ar' => "طلبك رقم #{$orderNumber} في الطريق إليك",
            ],
            'delivered' => [
                'title' => '🎉 Order Delivered!',
                'title_ar' => '🎉 تم التوصيل!',
                'message' => "Your order #{$orderNumber} has been delivered. Enjoy!",
                'message_ar' => "تم توصيل طلبك رقم #{$orderNumber}. بالهنا والشفا!",
            ],
            'cancelled' => [
                'title' => '❌ Order Cancelled',
                'title_ar' => '❌ تم إلغاء الطلب',
                'message' => $reason
                    ? "Your order #{$orderNumber} has been cancelled. Reason: {$reason}"
                    : "Your order #{$orderNumber} has been cancelled",
                'message_ar' => $reason
                    ? "تم إلغاء طلبك رقم #{$orderNumber}. السبب: {$reason}"
                    : "تم إلغاء طلبك رقم #{$orderNumber}",
            ],
            'failed' => [
                'title' => '⚠️ Order Failed',
                'title_ar' => '⚠️ فشل الطلب',
                'message' => "There was a problem with your order #{$orderNumber}",
                'message_ar' => "حدثت مشكلة في طلبك رقم #{$orderNumber}",
            ],
        ];

        $template = $templates[$status] ?? $templates['pending'];

        return $this->sendToUser(
            $userId,
            'order',
            $template['title'],
            $template['message'],
            [
                'order_id' => $orderId,
                'order_number' => $orderNumber,
                'status' => $status,
            ],
            $template['title_ar'],
            $template['message_ar'],
            "/orders/{$orderId}"
        );
    }

    /**
     * Queue order status notification (high priority).
     */
    public function queueOrderStatusNotification(
        int $userId,
        string $orderId,
        string $orderNumber,
        string $status,
        ?string $reason = null
    ): void {
        SendOrderNotification::dispatch(
            $userId,
            $orderId,
            $orderNumber,
            $status,
            $reason
        );
    }

    /**
     * Send promotion notification (broadcast).
     */
    public function sendPromotionNotification(
        string $title,
        string $message,
        int $promotionId,
        ?string $titleAr = null,
        ?string $messageAr = null,
        ?string $imageUrl = null
    ): Notification {
        return $this->sendBroadcast(
            'promotion',
            $title,
            $message,
            ['promotion_id' => $promotionId],
            $titleAr,
            $messageAr,
            "/promotions/{$promotionId}",
            $imageUrl
        );
    }

    /**
     * Send promo code notification (broadcast).
     */
    public function sendPromoCodeNotification(
        string $code,
        string $type,
        $value,
        \DateTime $expiresAt
    ): Notification {
        $discountText = $type === 'percentage' ? "{$value}%" : "{$value} EGP";

        return $this->sendBroadcast(
            'promo',
            "🎟️ New Promo Code: {$code}",
            "Use code {$code} to get {$discountText} off your next order! Valid until " . $expiresAt->format('M d'),
            ['promo_code' => $code],
            "🎟️ كود خصم جديد: {$code}",
            "استخدم الكود {$code} واحصل على خصم {$discountText} على طلبك القادم! صالح حتى " . $expiresAt->format('d/m'),
            "/offers"
        );
    }

    /**
     * Send complaint notification.
     */
    public function sendComplaintNotification(
        int $userId,
        int $complaintId,
        string $ticketNumber,
        string $event,
        ?string $message = null
    ): ?Notification {
        $templates = [
            'received' => [
                'title' => '📩 Complaint Received',
                'title_ar' => '📩 تم استلام الشكوى',
                'message' => "We've received your complaint #{$ticketNumber}. We'll respond soon.",
                'message_ar' => "تم استلام شكواك رقم #{$ticketNumber}. سنرد عليك قريباً.",
            ],
            'reply' => [
                'title' => '💬 Support Response',
                'title_ar' => '💬 رد من الدعم',
                'message' => "You have a new response on complaint #{$ticketNumber}",
                'message_ar' => "لديك رد جديد على الشكوى رقم #{$ticketNumber}",
            ],
            'in_progress' => [
                'title' => '🔄 Complaint In Progress',
                'title_ar' => '🔄 الشكوى قيد المعالجة',
                'message' => "Your complaint #{$ticketNumber} is being processed",
                'message_ar' => "شكواك رقم #{$ticketNumber} قيد المعالجة",
            ],
            'resolved' => [
                'title' => '✅ Issue Resolved',
                'title_ar' => '✅ تم حل المشكلة',
                'message' => "Your complaint #{$ticketNumber} has been resolved",
                'message_ar' => "تم حل شكواك رقم #{$ticketNumber}",
            ],
            'closed' => [
                'title' => '📋 Complaint Closed',
                'title_ar' => '📋 تم إغلاق الشكوى',
                'message' => "Your complaint #{$ticketNumber} has been closed",
                'message_ar' => "تم إغلاق شكواك رقم #{$ticketNumber}",
            ],
        ];

        $template = $templates[$event] ?? $templates['reply'];

        return $this->sendToUser(
            $userId,
            'support',
            $template['title'],
            $message ?? $template['message'],
            [
                'complaint_id' => $complaintId,
                'ticket_number' => $ticketNumber,
                'event' => $event,
            ],
            $template['title_ar'],
            $template['message_ar'],
            "/complaints/{$complaintId}"
        );
    }

    /**
     * Send wallet notification.
     */
    public function sendWalletNotification(
        int $userId,
        string $type,
        float $amount,
        float $newBalance,
        ?string $reference = null
    ): ?Notification {
        if ($type === 'credit') {
            return $this->sendToUser(
                $userId,
                'wallet',
                '💵 Wallet Credited',
                sprintf("%.2f EGP has been added to your wallet. New balance: %.2f EGP", $amount, $newBalance),
                [
                    'amount' => $amount,
                    'new_balance' => $newBalance,
                    'reference' => $reference,
                    'transaction_type' => 'credit',
                ],
                '💵 تم شحن المحفظة',
                sprintf("تم إضافة %.2f جنيه إلى محفظتك. الرصيد الجديد: %.2f جنيه", $amount, $newBalance),
                '/profile/wallet'
            );
        } elseif ($type === 'debit') {
            return $this->sendToUser(
                $userId,
                'wallet',
                '💸 Wallet Deducted',
                sprintf("%.2f EGP has been deducted from your wallet. New balance: %.2f EGP", $amount, $newBalance),
                [
                    'amount' => $amount,
                    'new_balance' => $newBalance,
                    'reference' => $reference,
                    'transaction_type' => 'debit',
                ],
                '💸 تم الخصم من المحفظة',
                sprintf("تم خصم %.2f جنيه من محفظتك. الرصيد الجديد: %.2f جنيه", $amount, $newBalance),
                '/profile/wallet'
            );
        }

        return null;
    }

    /**
     * Send welcome notification.
     */
    public function sendWelcomeNotification(int $userId, string $firstName): ?Notification
    {
        return $this->sendToUser(
            $userId,
            'account',
            '👋 Welcome to El Baraka!',
            "Hi {$firstName}! Thank you for joining us. Explore our fresh products and great deals!",
            ['event' => 'welcome'],
            '👋 أهلاً بك في البركة!',
            "مرحباً {$firstName}! شكراً لانضمامك إلينا. استكشف منتجاتنا الطازجة وعروضنا الرائعة!",
            '/(tabs)/home'
        );
    }

    /**
     * Send refund notification.
     *
     * @param string $type One of: 'full', 'penalty', 'partial', 'cod_cancel'
     */
    public function sendRefundNotification(
        int $userId,
        string $orderNumber,
        float $amount,
        string $type = 'full'
    ): ?Notification {
        $isCardRefund = in_array($type, ['full', 'penalty', 'partial']);

        $title = match ($type) {
            'full' => '💰 Full Refund Processed',
            'penalty' => '💰 Refund Processed (Fee Applied)',
            'partial' => '💰 Partial Refund Processed',
            'cod_cancel' => '📦 Order Cancelled',
            default => '💰 Refund Processed',
        };

        $titleAr = match ($type) {
            'full' => '💰 تم استرداد المبلغ بالكامل',
            'penalty' => '💰 تم استرداد المبلغ (مع خصم رسوم)',
            'partial' => '💰 تم استرداد جزء من المبلغ',
            'cod_cancel' => '📦 تم إلغاء الطلب',
            default => '💰 تم استرداد المبلغ',
        };

        if ($type === 'cod_cancel') {
            $body = sprintf("Your order #%s has been cancelled successfully.", $orderNumber);
            $bodyAr = sprintf("تم إلغاء طلبك رقم #%s بنجاح.", $orderNumber);
        } elseif ($isCardRefund) {
            $body = sprintf("%.2f EGP has been refunded to your card for order #%s. Please allow 5-14 business days for the refund to appear.", $amount, $orderNumber);
            $bodyAr = sprintf("تم استرداد %.2f جنيه إلى بطاقتك للطلب رقم #%s. يرجى الانتظار 5-14 يوم عمل.", $amount, $orderNumber);
        } else {
            $body = sprintf("%.2f EGP has been refunded to your wallet for order #%s.", $amount, $orderNumber);
            $bodyAr = sprintf("تم استرداد %.2f جنيه إلى محفظتك للطلب رقم #%s.", $amount, $orderNumber);
        }

        return $this->sendToUser(
            $userId,
            $type === 'cod_cancel' ? 'order' : 'wallet',
            $title,
            $body,
            [
                'amount' => $amount,
                'order_number' => $orderNumber,
                'refund_type' => $type,
            ],
            $titleAr,
            $bodyAr,
            $type === 'cod_cancel' ? '/orders' : '/profile/wallet'
        );
    }
}
