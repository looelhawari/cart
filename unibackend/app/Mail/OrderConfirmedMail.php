<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderConfirmedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order)
    {
        $this->order->loadMissing(['items.product', 'user', 'deliveryAddress']);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Order #{$this->order->order_number} Confirmed – We're preparing your order! | " . config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.order-confirmed-email',
            with: ['order' => $this->order],
        );
    }

    public function attachments(): array
    {
        return [];
    }

    public function build(): self
    {
        return $this->view('emails.order-confirmed-email')
                    ->with('order', $this->order)
                    ->subject("Order #{$this->order->order_number} Confirmed – We're preparing your order! | " . config('app.name'));
    }
}
