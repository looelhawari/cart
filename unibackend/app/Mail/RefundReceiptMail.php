<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\OrderRefund;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * RefundReceiptMail — Enterprise-grade refund receipt email.
 *
 * Sent to the customer after a successful refund is processed.
 * Supports full, penalty, partial, and COD cancel types.
 */
class RefundReceiptMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Order $order;
    public ?OrderRefund $refund;
    public string $refundType;
    public float $refundAmount;
    public float $penaltyAmount;
    public float $penaltyPercent;
    public string $customerName;

    public function __construct(
        Order $order,
        ?OrderRefund $refund,
        string $refundType,
        float $refundAmount,
        float $penaltyAmount = 0,
        float $penaltyPercent = 0
    ) {
        $this->order = $order;
        $this->refund = $refund;
        $this->refundType = $refundType;
        $this->refundAmount = $refundAmount;
        $this->penaltyAmount = $penaltyAmount;
        $this->penaltyPercent = $penaltyPercent;

        $user = $order->user;
        $this->customerName = $user
            ? trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''))
            : 'Valued Customer';
    }

    public function envelope(): Envelope
    {
        $subject = match ($this->refundType) {
            'full' => "Refund Receipt — Order #{$this->order->order_number}",
            'penalty' => "Refund Receipt (Fee Applied) — Order #{$this->order->order_number}",
            'partial' => "Partial Refund Receipt — Order #{$this->order->order_number}",
            'cod_cancel' => "Order Cancelled — #{$this->order->order_number}",
            default => "Refund Receipt — Order #{$this->order->order_number}",
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.refund-receipt');
    }
}
