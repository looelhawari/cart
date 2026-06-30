<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;
    public string $purpose;

    /**
     * Create a new message instance.
     */
    public function __construct(string $otp, string $purpose = 'Email Verification')
    {
        $this->otp = $otp;
        $this->purpose = $purpose;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = match ($this->purpose) {
            'Password Reset' => 'CART — Password Reset Code',
            'Email Change Verification' => 'CART — Email Change Code',
            default => 'CART — Verification Code',
        };

        return new Envelope(
            from: new Address(config('mail.from.address'), config('mail.from.name', 'CART')),
            replyTo: [
                new Address(config('mail.reply_to.address'), config('mail.reply_to.name', 'CART')),
            ],
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.otp',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
