<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * PERFORMANCE HARDENED (audit C12 — sync mail in request path):
 * Implementing ShouldQueue makes every Mail::to(...)->send(this) call
 * dispatch to the queue automatically — the SMTP round-trip (up to 30s on
 * a slow MX) no longer blocks the HTTP worker thread.
 */
class InvoiceMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $orderNumber;
    public string $customerName;
    public string $total;
    private string $pdfContent;
    private string $filename;

    public function __construct(
        string $orderNumber,
        string $customerName,
        string $total,
        string $pdfContent,
        string $filename
    ) {
        $this->orderNumber  = $orderNumber;
        $this->customerName = $customerName;
        $this->total        = $total;
        $this->pdfContent   = $pdfContent;
        $this->filename     = $filename;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Your Invoice for Order #{$this->orderNumber}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.invoice-email',
        );
    }

    public function attachments(): array
    {
        return [];
    }

    public function build(): self
    {
        $mail = $this->view('emails.invoice-email')
                     ->subject("Your Invoice for Order #{$this->orderNumber}");

        // Attach PDF from raw content
        $mail->attachData($this->pdfContent, $this->filename, [
            'mime' => 'application/pdf',
        ]);

        return $mail;
    }
}
