<?php

namespace App\Jobs;

use App\Models\PromoCode;
use App\Models\User;
use App\Services\EnterpriseNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Process coupon expiration reminders.
 * Schedule: Run daily at 9 AM
 */
class ProcessCouponExpirationReminders implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(EnterpriseNotificationService $notificationService): void
    {
        $now = now();

        // Get coupons expiring in 24-48 hours
        $expiringCoupons = PromoCode::where('is_active', true)
            ->where('expires_at', '>', $now->copy()->addHours(24))
            ->where('expires_at', '<=', $now->copy()->addHours(48))
            ->get();

        foreach ($expiringCoupons as $coupon) {
            $hoursRemaining = $now->diffInHours($coupon->expires_at);

            // If coupon is user-specific
            if ($coupon->user_id) {
                $notificationService->notifyCouponExpiring(
                    $coupon->user_id,
                    $coupon->code,
                    $hoursRemaining
                );
                Log::info('CouponExpiration: Personal coupon reminder sent', [
                    'user_id' => $coupon->user_id,
                    'code' => $coupon->code,
                ]);
            }
            // For public coupons, notify users who have used similar coupons before
            // This would require tracking coupon usage history
        }

        // Get coupons that just expired (notify users)
        $justExpired = PromoCode::where('is_active', true)
            ->where('expires_at', '<=', $now)
            ->where('expires_at', '>', $now->copy()->subHours(24))
            ->get();

        foreach ($justExpired as $coupon) {
            if ($coupon->user_id) {
                $notificationService->notifyCouponExpired(
                    $coupon->user_id,
                    $coupon->code
                );
                Log::info('CouponExpiration: Expired notification sent', [
                    'user_id' => $coupon->user_id,
                    'code' => $coupon->code,
                ]);
            }

            // Deactivate expired coupons
            $coupon->is_active = false;
            $coupon->save();
        }
    }
}
