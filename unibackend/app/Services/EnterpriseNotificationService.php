<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\NotificationTemplate;
use App\Models\NotificationAnalytics;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Enterprise Notification Service - Handles all 70+ notification types
 * Extends base PushNotificationService with template-based notifications
 */
class EnterpriseNotificationService
{
    protected PushNotificationService $pushService;

    public function __construct(PushNotificationService $pushService)
    {
        $this->pushService = $pushService;
    }

    /**
     * Send notification using template code with variable substitution.
     */
    public function sendFromTemplate(
        string $templateCode,
        int $userId,
        array $variables = [],
        ?string $customActionTarget = null,
        ?string $imageUrl = null
    ): ?Notification {
        $template = NotificationTemplate::where('code', $templateCode)->first();

        if (!$template || !$template->is_active) {
            Log::warning('EnterpriseNotification: Template not found or inactive', [
                'code' => $templateCode,
                'user_id' => $userId,
            ]);
            return null;
        }

        // Substitute variables in title and message
        $title = $this->substituteVariables($template->title, $variables);
        $titleAr = $this->substituteVariables($template->title_ar, $variables);
        $message = $this->substituteVariables($template->message, $variables);
        $messageAr = $this->substituteVariables($template->message_ar, $variables);
        $actionTarget = $customActionTarget ?? $this->substituteVariables($template->default_action_target, $variables);

        // Add template data to notification data
        $data = array_merge($variables, [
            'template_code' => $templateCode,
            'priority' => $template->priority,
            'category' => $template->category,
        ]);

        return $this->pushService->sendToUser(
            $userId,
            $template->category,
            $title,
            $message,
            $data,
            $titleAr,
            $messageAr,
            $actionTarget,
            $imageUrl
        );
    }

    /**
     * Broadcast notification using template code.
     */
    public function broadcastFromTemplate(
        string $templateCode,
        array $variables = [],
        ?string $customActionTarget = null,
        ?string $imageUrl = null
    ): ?Notification {
        $template = NotificationTemplate::where('code', $templateCode)->first();

        if (!$template || !$template->is_active) {
            Log::warning('EnterpriseNotification: Template not found for broadcast', [
                'code' => $templateCode,
            ]);
            return null;
        }

        $title = $this->substituteVariables($template->title, $variables);
        $titleAr = $this->substituteVariables($template->title_ar, $variables);
        $message = $this->substituteVariables($template->message, $variables);
        $messageAr = $this->substituteVariables($template->message_ar, $variables);
        $actionTarget = $customActionTarget ?? $this->substituteVariables($template->default_action_target, $variables);

        $data = array_merge($variables, [
            'template_code' => $templateCode,
            'priority' => $template->priority,
            'category' => $template->category,
        ]);

        return $this->pushService->sendBroadcast(
            $template->category,
            $title,
            $message,
            $data,
            $titleAr,
            $messageAr,
            $actionTarget,
            $imageUrl
        );
    }

    /**
     * Substitute template variables.
     */
    protected function substituteVariables(?string $text, array $variables): ?string
    {
        if (!$text) return null;

        foreach ($variables as $key => $value) {
            $text = str_replace('{' . $key . '}', (string) $value, $text);
            $text = str_replace('{' . $key . '}', (string) $value, $text);
        }

        return $text;
    }

    // ==================== ORDER & DELIVERY NOTIFICATIONS ====================

    public function notifyOrderPlaced(int $userId, string $orderNumber, string $orderId, float $total): ?Notification
    {
        return $this->sendFromTemplate('order_placed', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'total' => number_format($total, 2),
        ]);
    }

    public function notifyOrderConfirmed(int $userId, string $orderNumber, string $orderId): ?Notification
    {
        return $this->sendFromTemplate('order_confirmed', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
        ]);
    }

    public function notifyOrderPreparing(int $userId, string $orderNumber, string $orderId): ?Notification
    {
        return $this->sendFromTemplate('order_preparing', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
        ]);
    }

    public function notifyOrderCancelledByStore(int $userId, string $orderNumber, string $orderId, string $reason): ?Notification
    {
        return $this->sendFromTemplate('order_cancelled_store', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'reason' => $reason,
        ]);
    }

    public function notifyOrderModified(int $userId, string $orderNumber, string $orderId, float $newTotal, string $changes): ?Notification
    {
        return $this->sendFromTemplate('order_modified', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'total' => number_format($newTotal, 2),
            'changes' => $changes,
        ]);
    }

    public function notifyPaymentFailed(int $userId, string $orderNumber, string $orderId): ?Notification
    {
        return $this->sendFromTemplate('payment_failed', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
        ]);
    }

    public function notifyPaymentSuccessful(int $userId, string $orderNumber, string $orderId, float $amount): ?Notification
    {
        return $this->sendFromTemplate('payment_successful', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'amount' => number_format($amount, 2),
        ]);
    }

    public function notifyOutForDelivery(int $userId, string $orderNumber, string $orderId, ?string $eta = null, ?string $driverName = null): ?Notification
    {
        return $this->sendFromTemplate('out_for_delivery', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'eta' => $eta ?? '30-45 mins',
            'driver_name' => $driverName ?? 'Your driver',
        ]);
    }

    public function notifyCourierNearby(int $userId, string $orderNumber, string $orderId, string $distance): ?Notification
    {
        return $this->sendFromTemplate('courier_nearby', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'distance' => $distance,
        ]);
    }

    public function notifyDeliveryDelayed(int $userId, string $orderNumber, string $orderId, string $newEta, ?string $reason = null): ?Notification
    {
        return $this->sendFromTemplate('delivery_delayed', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'new_eta' => $newEta,
            'reason' => $reason ?? 'High demand',
        ]);
    }

    public function notifyOrderDelivered(int $userId, string $orderNumber, string $orderId): ?Notification
    {
        return $this->sendFromTemplate('order_delivered', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
        ]);
    }

    public function notifyDeliveryFailed(int $userId, string $orderNumber, string $orderId, string $reason): ?Notification
    {
        return $this->sendFromTemplate('delivery_failed', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'reason' => $reason,
        ]);
    }

    public function notifyOrderReturned(int $userId, string $orderNumber, string $orderId): ?Notification
    {
        return $this->sendFromTemplate('order_returned', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
        ]);
    }

    public function notifyRefundInitiated(int $userId, string $orderNumber, string $orderId, float $amount): ?Notification
    {
        return $this->sendFromTemplate('refund_initiated', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'amount' => number_format($amount, 2),
        ]);
    }

    public function notifyRefundCompleted(int $userId, string $orderNumber, string $orderId, float $amount): ?Notification
    {
        return $this->sendFromTemplate('refund_completed', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'amount' => number_format($amount, 2),
        ]);
    }

    public function notifyInvoiceReady(int $userId, string $orderNumber, string $orderId, ?string $invoiceUrl = null): ?Notification
    {
        return $this->sendFromTemplate('invoice_ready', $userId, [
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'invoice_url' => $invoiceUrl,
        ]);
    }

    // ==================== PRODUCT & INVENTORY NOTIFICATIONS ====================

    public function notifyProductBackInStock(int $userId, string $productName, int $productId, ?string $imageUrl = null): ?Notification
    {
        return $this->sendFromTemplate('product_back_in_stock', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
            'product_image' => $imageUrl,
        ], null, $imageUrl);
    }

    public function notifyProductOutOfStockInCart(int $userId, string $productName, int $productId): ?Notification
    {
        return $this->sendFromTemplate('product_out_of_stock_cart', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
        ]);
    }

    public function notifyProductLowStock(int $userId, string $productName, int $productId, int $quantity): ?Notification
    {
        return $this->sendFromTemplate('product_low_stock', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
            'quantity' => $quantity,
        ]);
    }

    public function notifyNewProductInCategory(int $userId, string $productName, int $productId, string $categoryName): ?Notification
    {
        return $this->sendFromTemplate('new_product_category', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
            'category_name' => $categoryName,
        ]);
    }

    public function notifyProductPriceChanged(int $userId, string $productName, int $productId, float $oldPrice, float $newPrice): ?Notification
    {
        return $this->sendFromTemplate('product_price_changed', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
            'old_price' => number_format($oldPrice, 2),
            'new_price' => number_format($newPrice, 2),
        ]);
    }

    public function notifyProductDiscontinued(int $userId, string $productName, int $productId, int $categoryId): ?Notification
    {
        return $this->sendFromTemplate('product_discontinued', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
            'category_id' => $categoryId,
        ]);
    }

    // ==================== PROMOTIONS & OFFERS NOTIFICATIONS ====================

    public function notifyNewOffer(string $offerTitle, int $offerId, int $discount): ?Notification
    {
        return $this->broadcastFromTemplate('new_offer', [
            'offer_title' => $offerTitle,
            'offer_id' => $offerId,
            'discount' => $discount,
        ]);
    }

    public function notifyFlashSaleStarted(string $saleTitle, int $saleId, int $discount, int $hours): ?Notification
    {
        return $this->broadcastFromTemplate('flash_sale_started', [
            'sale_title' => $saleTitle,
            'sale_id' => $saleId,
            'discount' => $discount,
            'hours' => $hours,
        ]);
    }

    public function notifyFlashSaleEnding(string $saleTitle, int $saleId, int $minutes): ?Notification
    {
        return $this->broadcastFromTemplate('flash_sale_ending', [
            'sale_title' => $saleTitle,
            'sale_id' => $saleId,
            'minutes' => $minutes,
        ]);
    }

    public function notifyLimitedTimeDeal(string $productName, int $productId, float $price): ?Notification
    {
        return $this->broadcastFromTemplate('limited_time_deal', [
            'product_name' => $productName,
            'product_id' => $productId,
            'price' => number_format($price, 2),
        ]);
    }

    public function notifyBuyOneGetOne(string $productName, int $productId): ?Notification
    {
        return $this->broadcastFromTemplate('buy_one_get_one', [
            'product_name' => $productName,
            'product_id' => $productId,
        ]);
    }

    public function notifyPriceDropOnWatched(int $userId, string $productName, int $productId, float $oldPrice, float $newPrice): ?Notification
    {
        return $this->sendFromTemplate('price_drop_watched', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
            'old_price' => number_format($oldPrice, 2),
            'new_price' => number_format($newPrice, 2),
        ]);
    }

    public function notifyCouponAvailable(int $userId, string $code, string $discount, string $expires): ?Notification
    {
        return $this->sendFromTemplate('coupon_available', $userId, [
            'code' => $code,
            'discount' => $discount,
            'expires' => $expires,
        ]);
    }

    public function notifyCouponExpiring(int $userId, string $code, int $hours): ?Notification
    {
        return $this->sendFromTemplate('coupon_expiring', $userId, [
            'code' => $code,
            'hours' => $hours,
        ]);
    }

    public function notifyCouponExpired(int $userId, string $code): ?Notification
    {
        return $this->sendFromTemplate('coupon_expired', $userId, [
            'code' => $code,
        ]);
    }

    public function notifyLoyaltyReward(int $userId, int $points, string $reward): ?Notification
    {
        return $this->sendFromTemplate('loyalty_reward', $userId, [
            'points' => $points,
            'reward' => $reward,
        ]);
    }

    public function notifyPersonalizedOffer(int $userId, string $offerDescription, int $offerId): ?Notification
    {
        return $this->sendFromTemplate('personalized_offer', $userId, [
            'offer_description' => $offerDescription,
            'offer_id' => $offerId,
        ]);
    }

    // ==================== CART & CHECKOUT NOTIFICATIONS ====================

    public function notifyCartItemRemovedStock(int $userId, string $productName, int $productId): ?Notification
    {
        return $this->sendFromTemplate('cart_item_removed_stock', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
        ]);
    }

    public function notifyCartPriceChanged(int $userId, string $productName, float $oldPrice, float $newPrice): ?Notification
    {
        return $this->sendFromTemplate('cart_price_changed', $userId, [
            'product_name' => $productName,
            'old_price' => number_format($oldPrice, 2),
            'new_price' => number_format($newPrice, 2),
        ]);
    }

    public function notifyCartAbandoned1h(int $userId, int $count, float $total): ?Notification
    {
        return $this->sendFromTemplate('cart_abandoned_1h', $userId, [
            'count' => $count,
            'total' => number_format($total, 2),
        ]);
    }

    public function notifyCartAbandoned24h(int $userId, int $count, float $total): ?Notification
    {
        return $this->sendFromTemplate('cart_abandoned_24h', $userId, [
            'count' => $count,
            'total' => number_format($total, 2),
        ]);
    }

    public function notifyCartItemRestocked(int $userId, string $productName, int $productId): ?Notification
    {
        return $this->sendFromTemplate('cart_item_restocked', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
        ]);
    }

    public function notifyMinimumOrderWarning(int $userId, float $amount, float $minimum): ?Notification
    {
        return $this->sendFromTemplate('minimum_order_warning', $userId, [
            'amount' => number_format($amount, 2),
            'minimum' => number_format($minimum, 2),
        ]);
    }

    public function notifyFreeDeliveryUnlocked(int $userId): ?Notification
    {
        return $this->sendFromTemplate('free_delivery_unlocked', $userId, []);
    }

    // ==================== CHAT & SUPPORT NOTIFICATIONS ====================

    public function notifyNewSupportMessage(int $userId, int $complaintId, string $ticketNumber): ?Notification
    {
        return $this->sendFromTemplate('new_support_message', $userId, [
            'complaint_id' => $complaintId,
            'ticket_number' => $ticketNumber,
        ]);
    }

    public function notifyAgentJoinedChat(int $userId, int $complaintId, string $agentName): ?Notification
    {
        return $this->sendFromTemplate('agent_joined_chat', $userId, [
            'complaint_id' => $complaintId,
            'agent_name' => $agentName,
        ]);
    }

    public function notifyChatEscalated(int $userId, int $complaintId, string $ticketNumber): ?Notification
    {
        return $this->sendFromTemplate('chat_escalated', $userId, [
            'complaint_id' => $complaintId,
            'ticket_number' => $ticketNumber,
        ]);
    }

    public function notifySupportTicketUpdated(int $userId, int $complaintId, string $ticketNumber, string $status): ?Notification
    {
        return $this->sendFromTemplate('support_ticket_updated', $userId, [
            'complaint_id' => $complaintId,
            'ticket_number' => $ticketNumber,
            'status' => $status,
        ]);
    }

    public function notifySupportTicketResolved(int $userId, int $complaintId, string $ticketNumber): ?Notification
    {
        return $this->sendFromTemplate('support_ticket_resolved', $userId, [
            'complaint_id' => $complaintId,
            'ticket_number' => $ticketNumber,
        ]);
    }

    public function notifyChatClosed(int $userId, int $complaintId, string $ticketNumber): ?Notification
    {
        return $this->sendFromTemplate('chat_closed', $userId, [
            'complaint_id' => $complaintId,
            'ticket_number' => $ticketNumber,
        ]);
    }

    // ==================== ACCOUNT & SECURITY NOTIFICATIONS ====================

    public function notifyNewLoginDetected(int $userId, string $device, string $location, string $time, string $ip): ?Notification
    {
        return $this->sendFromTemplate('new_login_detected', $userId, [
            'device' => $device,
            'location' => $location,
            'time' => $time,
            'ip' => $ip,
        ]);
    }

    public function notifyNewDeviceLogin(int $userId, string $deviceType, string $deviceName, string $location): ?Notification
    {
        return $this->sendFromTemplate('new_device_login', $userId, [
            'device_type' => $deviceType,
            'device_name' => $deviceName,
            'location' => $location,
        ]);
    }

    public function notifyPasswordChanged(int $userId): ?Notification
    {
        return $this->sendFromTemplate('password_changed', $userId, []);
    }

    public function notifyPasswordResetRequested(int $userId): ?Notification
    {
        return $this->sendFromTemplate('password_reset_requested', $userId, []);
    }

    public function notifyEmailChanged(int $userId, string $newEmail): ?Notification
    {
        return $this->sendFromTemplate('email_changed', $userId, [
            'new_email' => $newEmail,
        ]);
    }

    public function notifyPhoneChanged(int $userId, string $newPhone): ?Notification
    {
        return $this->sendFromTemplate('phone_changed', $userId, [
            'new_phone' => $newPhone,
        ]);
    }

    public function notifySuspiciousActivity(int $userId, string $activityType, string $location): ?Notification
    {
        return $this->sendFromTemplate('suspicious_activity', $userId, [
            'activity_type' => $activityType,
            'location' => $location,
        ]);
    }

    public function notifyAccountLocked(int $userId, string $reason): ?Notification
    {
        return $this->sendFromTemplate('account_locked', $userId, [
            'reason' => $reason,
        ]);
    }

    public function notifyAccountVerified(int $userId): ?Notification
    {
        return $this->sendFromTemplate('account_verified', $userId, []);
    }

    public function notifyVerificationFailed(int $userId, ?string $reason = null): ?Notification
    {
        return $this->sendFromTemplate('verification_failed', $userId, [
            'reason' => $reason ?? 'Unknown error',
        ]);
    }

    // ==================== WALLET & PAYMENTS NOTIFICATIONS ====================

    public function notifyWalletCredited(int $userId, float $amount, float $balance, ?string $reference = null): ?Notification
    {
        return $this->sendFromTemplate('wallet_credited', $userId, [
            'amount' => number_format($amount, 2),
            'balance' => number_format($balance, 2),
            'reference' => $reference ?? '',
        ]);
    }

    public function notifyWalletDebited(int $userId, float $amount, float $balance, ?string $reference = null): ?Notification
    {
        return $this->sendFromTemplate('wallet_debited', $userId, [
            'amount' => number_format($amount, 2),
            'balance' => number_format($balance, 2),
            'reference' => $reference ?? '',
        ]);
    }

    public function notifyCashbackReceived(int $userId, float $amount, string $orderNumber): ?Notification
    {
        return $this->sendFromTemplate('cashback_received', $userId, [
            'amount' => number_format($amount, 2),
            'order_number' => $orderNumber,
        ]);
    }

    public function notifyCashbackExpiring(int $userId, float $amount, int $days): ?Notification
    {
        return $this->sendFromTemplate('cashback_expiring', $userId, [
            'amount' => number_format($amount, 2),
            'days' => $days,
        ]);
    }

    public function notifyLowWalletBalance(int $userId, float $balance): ?Notification
    {
        return $this->sendFromTemplate('low_wallet_balance', $userId, [
            'balance' => number_format($balance, 2),
        ]);
    }

    public function notifyCardAdded(int $userId, string $last4, string $cardType): ?Notification
    {
        return $this->sendFromTemplate('card_added', $userId, [
            'last4' => $last4,
            'card_type' => $cardType,
        ]);
    }

    public function notifyCardRemoved(int $userId, string $last4): ?Notification
    {
        return $this->sendFromTemplate('card_removed', $userId, [
            'last4' => $last4,
        ]);
    }

    // ==================== ADDRESS NOTIFICATIONS ====================

    public function notifyAddressAdded(int $userId, string $label, int $addressId): ?Notification
    {
        return $this->sendFromTemplate('address_added', $userId, [
            'label' => $label,
            'address_id' => $addressId,
        ]);
    }

    public function notifyDeliveryAreaUnavailable(int $userId, string $area): ?Notification
    {
        return $this->sendFromTemplate('delivery_area_unavailable', $userId, [
            'area' => $area,
        ]);
    }

    public function notifyDeliveryAreaAvailable(int $userId, string $area): ?Notification
    {
        return $this->sendFromTemplate('delivery_area_available', $userId, [
            'area' => $area,
        ]);
    }

    public function notifyServiceUnavailableLocation(int $userId, string $area, ?string $reason = null): ?Notification
    {
        return $this->sendFromTemplate('service_unavailable_location', $userId, [
            'area' => $area,
            'reason' => $reason ?? 'Temporary service issue',
        ]);
    }

    // ==================== SYSTEM & POLICY NOTIFICATIONS ====================

    public function notifyTermsUpdated(): ?Notification
    {
        return $this->broadcastFromTemplate('terms_updated', []);
    }

    public function notifyPrivacyUpdated(): ?Notification
    {
        return $this->broadcastFromTemplate('privacy_updated', []);
    }

    public function notifyRefundPolicyUpdated(): ?Notification
    {
        return $this->broadcastFromTemplate('refund_policy_updated', []);
    }

    public function notifyAppUpdateAvailable(string $version, ?string $features = null): ?Notification
    {
        return $this->broadcastFromTemplate('app_update_available', [
            'version' => $version,
            'features' => $features ?? 'Bug fixes and improvements',
        ]);
    }

    public function notifyAppUpdateRequired(string $version): ?Notification
    {
        return $this->broadcastFromTemplate('app_update_required', [
            'version' => $version,
        ]);
    }

    public function notifyServiceOutage(?array $affectedServices = null): ?Notification
    {
        return $this->broadcastFromTemplate('service_outage', [
            'affected_services' => $affectedServices ? implode(', ', $affectedServices) : 'Some services',
        ]);
    }

    public function notifyMaintenanceScheduled(string $date, string $start, string $end): ?Notification
    {
        return $this->broadcastFromTemplate('maintenance_scheduled', [
            'date' => $date,
            'start' => $start,
            'end' => $end,
        ]);
    }

    public function notifyMaintenanceCompleted(): ?Notification
    {
        return $this->broadcastFromTemplate('maintenance_completed', []);
    }

    public function notifyLegalNotice(string $noticeTitle, string $noticeMessage, int $noticeId): ?Notification
    {
        return $this->broadcastFromTemplate('legal_notice', [
            'notice_title' => $noticeTitle,
            'notice_message' => $noticeMessage,
            'notice_id' => $noticeId,
        ]);
    }

    // ==================== SMART / AI NOTIFICATIONS ====================

    public function notifyReorderReminder(int $userId, string $productName, int $productId, ?string $lastOrdered = null): ?Notification
    {
        return $this->sendFromTemplate('reorder_reminder', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
            'last_ordered' => $lastOrdered ?? '2 weeks ago',
        ]);
    }

    public function notifyUsuallyBuyOffer(int $userId, string $productName, int $productId, int $discount): ?Notification
    {
        return $this->sendFromTemplate('usually_buy_offer', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
            'discount' => $discount,
        ]);
    }

    public function notifyForgotSomething(int $userId, string $productName, int $productId): ?Notification
    {
        return $this->sendFromTemplate('forgot_something', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
        ]);
    }

    public function notifyReorderPrevious(int $userId, string $orderId, string $date, float $total): ?Notification
    {
        return $this->sendFromTemplate('reorder_previous', $userId, [
            'order_id' => $orderId,
            'date' => $date,
            'total' => number_format($total, 2),
        ]);
    }

    public function notifyRecommendedForYou(int $userId, string $productName, int $productId): ?Notification
    {
        return $this->sendFromTemplate('recommended_for_you', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
        ]);
    }

    public function notifySimilarCheaper(int $userId, string $productName, int $productId, float $price): ?Notification
    {
        return $this->sendFromTemplate('similar_cheaper', $userId, [
            'product_name' => $productName,
            'product_id' => $productId,
            'price' => number_format($price, 2),
        ]);
    }

    // ==================== WELCOME NOTIFICATION ====================

    public function notifyWelcome(int $userId, string $name): ?Notification
    {
        return $this->sendFromTemplate('welcome', $userId, [
            'name' => $name,
        ]);
    }

    // ==================== CONVENIENCE WRAPPERS FOR ORDER MODEL ====================

    /**
     * Send order placed notification from Order model.
     */
    public function notifyOrderPlacedFromOrder($order): ?Notification
    {
        return $this->notifyOrderPlaced(
            $order->user_id,
            $order->order_number,
            (string) $order->id,
            $order->total
        );
    }

    /**
     * Send order confirmed notification from Order model.
     */
    public function notifyOrderConfirmedFromOrder($order): ?Notification
    {
        return $this->notifyOrderConfirmed(
            $order->user_id,
            $order->order_number,
            (string) $order->id
        );
    }

    /**
     * Send order preparing notification from Order model.
     */
    public function notifyOrderPreparingFromOrder($order): ?Notification
    {
        return $this->notifyOrderPreparing(
            $order->user_id,
            $order->order_number,
            (string) $order->id
        );
    }

    /**
     * Send out for delivery notification from Order model.
     */
    public function notifyOutForDeliveryFromOrder($order, ?string $eta = null, ?string $driverName = null): ?Notification
    {
        return $this->notifyOutForDelivery(
            $order->user_id,
            $order->order_number,
            (string) $order->id,
            $eta,
            $driverName
        );
    }

    /**
     * Send order delivered notification from Order model.
     */
    public function notifyOrderDeliveredFromOrder($order): ?Notification
    {
        return $this->notifyOrderDelivered(
            $order->user_id,
            $order->order_number,
            (string) $order->id
        );
    }

    /**
     * Send order cancelled notification from Order model.
     */
    public function notifyOrderCancelledFromOrder($order, ?string $reason = null): ?Notification
    {
        return $this->notifyOrderCancelledByStore(
            $order->user_id,
            $order->order_number,
            (string) $order->id,
            $reason ?? 'Order cancelled'
        );
    }

    /**
     * Send delivery failed notification from Order model.
     */
    public function notifyDeliveryFailedFromOrder($order, string $reason): ?Notification
    {
        return $this->notifyDeliveryFailed(
            $order->user_id,
            $order->order_number,
            (string) $order->id,
            $reason
        );
    }

    // ==================== CONVENIENCE WRAPPERS FOR LOGIN HISTORY MODEL ====================

    /**
     * Send new login detected notification from UserLoginHistory model.
     */
    public function notifyNewLoginFromHistory(int $userId, $loginRecord): ?Notification
    {
        return $this->notifyNewLoginDetected(
            $userId,
            $loginRecord->device_name ?? $loginRecord->device_type ?? 'Unknown device',
            $loginRecord->city ?? $loginRecord->country ?? 'Unknown location',
            $loginRecord->logged_in_at->format('M j, Y g:i A'),
            $loginRecord->ip_address ?? 'Unknown IP'
        );
    }

    /**
     * Send new device login notification from UserLoginHistory model.
     */
    public function notifyNewDeviceFromHistory(int $userId, $loginRecord): ?Notification
    {
        return $this->notifyNewDeviceLogin(
            $userId,
            $loginRecord->device_type ?? 'Unknown',
            $loginRecord->device_name ?? 'New Device',
            $loginRecord->city ?? $loginRecord->country ?? 'Unknown location'
        );
    }

    /**
     * Send suspicious activity notification with location.
     */
    public function notifySuspiciousLoginActivity(int $userId, string $activityType, ?string $location = null): ?Notification
    {
        return $this->notifySuspiciousActivity(
            $userId,
            $activityType,
            $location ?? 'Unknown location'
        );
    }

    // ==================== ANALYTICS TRACKING ====================

    public function trackNotificationEvent(int $notificationId, ?int $userId, string $eventType, ?string $platform = null, ?string $appState = null, ?array $metadata = null): void
    {
        try {
            NotificationAnalytics::create([
                'notification_id' => $notificationId,
                'user_id' => $userId,
                'event_type' => $eventType, // sent, delivered, opened, clicked, dismissed
                'platform' => $platform,
                'app_state' => $appState, // foreground, background, killed
                'metadata' => $metadata,
                'event_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('NotificationAnalytics: Failed to track event', [
                'notification_id' => $notificationId,
                'event_type' => $eventType,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
