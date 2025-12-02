<?php

namespace App\Services;

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
     * Send OTP via email.
     */
    public function sendEmail(string $email, string $otp, string $purpose = 'ElBaraka Email Verification'): bool
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
