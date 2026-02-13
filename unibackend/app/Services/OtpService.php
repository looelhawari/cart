<?php

namespace App\Services;

use App\Jobs\SendOtpEmail;
use App\Models\Otp;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class OtpService
{
    /**
     * Generate a 6-digit OTP.
     */
    public function generate(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Create OTP for email verification.
     */
    public function createEmailVerificationOtp(string $email): Otp
    {
        // Delete old unused OTPs for this email
        Otp::where('identifier', $email)
            ->where('type', 'email_verification')
            ->where('is_used', false)
            ->delete();

        return Otp::create([
            'identifier' => $email,
            'otp' => $this->generate(),
            'type' => 'email_verification',
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);
    }

    /**
     * Create OTP for password reset.
     */
    public function createPasswordResetOtp(string $email): Otp
    {
        // Delete old unused OTPs for this email
        Otp::where('identifier', $email)
            ->where('type', 'password_reset')
            ->where('is_used', false)
            ->delete();

        return Otp::create([
            'identifier' => $email,
            'otp' => $this->generate(),
            'type' => 'password_reset',
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);
    }

    /**
     * Create OTP for email change verification.
     * OTP is sent to the NEW email to prove ownership.
     */
    public function createEmailChangeOtp(string $newEmail): Otp
    {
        // Delete old unused OTPs for this new email
        Otp::where('identifier', $newEmail)
            ->where('type', 'email_change')
            ->where('is_used', false)
            ->delete();

        return Otp::create([
            'identifier' => $newEmail,
            'otp' => $this->generate(),
            'type' => 'email_change',
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);
    }

    /**
     * Verify OTP.
     */
    public function verify(string $identifier, string $otp, string $type): ?Otp
    {
        $otpRecord = Otp::where('identifier', $identifier)
            ->where('otp', $otp)
            ->where('type', $type)
            ->where('is_used', false)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        return $otpRecord;
    }

    /**
     * Send OTP via email - QUEUED for performance.
     *
     * This uses a queue job to prevent blocking the API response.
     * On a single server, this is CRITICAL for performance.
     */
    public function sendEmail(string $email, string $otp, string $purpose = 'ElBaraka Email Verification'): bool
    {
        try {
            // Dispatch to queue instead of sending synchronously
            SendOtpEmail::dispatch($email, $otp, $purpose);

            Log::info("OTP queued for {$email}");
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to queue OTP for {$email}: " . $e->getMessage());

            // Fallback to sync send if queue fails
            try {
                Mail::to($email)->send(new \App\Mail\OtpMail($otp, $purpose));
                Log::info("OTP sent synchronously to {$email} (fallback)");
                return true;
            } catch (\Exception $fallbackError) {
                Log::error("Fallback OTP send also failed: " . $fallbackError->getMessage());
                return false;
            }
        }
    }

    /**
     * Send OTP synchronously (for critical cases where queue might be down)
     */
    public function sendEmailSync(string $email, string $otp, string $purpose = 'ElBaraka Email Verification'): bool
    {
        try {
            Mail::to($email)->send(new \App\Mail\OtpMail($otp, $purpose));
            Log::info("OTP sent to {$email}: {$otp}");
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send OTP to {$email}: " . $e->getMessage());
            return false;
        }
    }
}
