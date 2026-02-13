<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// Import notification jobs
use App\Jobs\ProcessCartAbandonmentReminders;
use App\Jobs\ProcessFlashSaleNotifications;
use App\Jobs\ProcessReorderReminders;
use App\Jobs\ProcessProductWatchlistNotifications;
use App\Jobs\ProcessCouponExpirationReminders;
use App\Jobs\ReconcilePendingPayments;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ==================== ENTERPRISE NOTIFICATION SCHEDULES ====================

// Cart abandonment reminders - every 15 minutes
Schedule::job(new ProcessCartAbandonmentReminders)->everyFifteenMinutes()
    ->name('process-cart-abandonment')
    ->withoutOverlapping();

// Flash sale notifications - every 5 minutes
Schedule::job(new ProcessFlashSaleNotifications)->everyFiveMinutes()
    ->name('process-flash-sales')
    ->withoutOverlapping();

// Reorder reminders - daily at 10 AM
Schedule::job(new ProcessReorderReminders)->dailyAt('10:00')
    ->name('process-reorder-reminders')
    ->withoutOverlapping();

// Product watchlist (back in stock, price drops) - every 30 minutes
Schedule::job(new ProcessProductWatchlistNotifications)->everyThirtyMinutes()
    ->name('process-product-watchlist')
    ->withoutOverlapping();

// Coupon expiration reminders - daily at 9 AM
Schedule::job(new ProcessCouponExpirationReminders)->dailyAt('09:00')
    ->name('process-coupon-expiration')
    ->withoutOverlapping();

// ==================== PAYMENT RECONCILIATION ====================

// P1: Reconcile stale PENDING payments every 5 minutes
// Safety net for missed webhooks — queries Paymob server-to-server
Schedule::job(new ReconcilePendingPayments)->everyFiveMinutes()
    ->name('reconcile-pending-payments')
    ->withoutOverlapping();
