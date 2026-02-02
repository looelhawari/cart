<?php

namespace App\Jobs;

use App\Mail\OtpMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Queue job for sending OTP emails asynchronously
 * 
 * CRITICAL for single-server performance:
 * - OTP email sending can take 1-3 seconds
 * - This blocks the API response if done synchronously
 * - Queue offloads this to background workers
 */
class SendOtpEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying.
     */
    public int $backoff = 5;

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected string $email,
        protected string $otp,
        protected string $purpose = 'ElBaraka Email Verification'
    ) {
        $this->onQueue('emails'); // Use dedicated email queue
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Mail::to($this->email)->send(new OtpMail($this->otp, $this->purpose));
            
            Log::info('SendOtpEmail: OTP sent successfully', [
                'email' => $this->email,
                'purpose' => $this->purpose,
            ]);
        } catch (\Exception $e) {
            Log::error('SendOtpEmail: Failed to send OTP', [
                'email' => $this->email,
                'purpose' => $this->purpose,
                'error' => $e->getMessage(),
            ]);
            throw $e; // Re-throw to trigger retry
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendOtpEmail: Job failed permanently', [
            'email' => $this->email,
            'purpose' => $this->purpose,
            'error' => $exception->getMessage(),
        ]);
    }
}
