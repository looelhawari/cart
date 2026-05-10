<?php

namespace App\Services;

use App\Jobs\SendOtpEmail;
use App\Models\Otp;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * OTP service.
 *
 * SECURITY HARDENED:
 *   - OTPs are stored as bcrypt hashes (not plaintext). DB read alone no
 *     longer permits replay.
 *   - The plaintext OTP is never written to logs (was previously leaked
 *     by sendEmailSync at line 121 of the prior version).
 *
 * The 6-digit code is preserved in-memory long enough to send the email,
 * then discarded; only its hash is persisted.
 */
class OtpService
{
    /**
     * Generate a cryptographically random 6-digit OTP.
     */
    public function generate(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    public function createEmailVerificationOtp(string $email): Otp
    {
        return $this->createOtp($email, 'email_verification');
    }

    public function createPasswordResetOtp(string $email): Otp
    {
        return $this->createOtp($email, 'password_reset');
    }

    /**
     * Create OTP for email-change verification (sent to the NEW email to
     * prove ownership).
     */
    public function createEmailChangeOtp(string $newEmail): Otp
    {
        return $this->createOtp($newEmail, 'email_change');
    }

    /**
     * Common create path. Stores the bcrypt hash of the code; the plaintext
     * is held only on the returned model instance (in-memory) so the caller
     * can ship it to the user via email/SMS, then it's gone.
     */
    private function createOtp(string $identifier, string $type): Otp
    {
        // Delete previous unused OTPs for this identifier+type
        Otp::where('identifier', $identifier)
            ->where('type', $type)
            ->where('is_used', false)
            ->delete();

        $plain = $this->generate();

        $otp = Otp::create([
            'identifier' => $identifier,
            'otp' => Hash::make($plain),
            'type' => $type,
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        // Expose the plaintext on the returned instance for sending only.
        // It is NOT persisted in this form.
        $otp->setAttribute('plaintext_otp', $plain);

        return $otp;
    }

    /**
     * Verify a submitted OTP against the stored hash.
     *
     * Returns the matching Otp model if the code is valid (and not expired
     * or used), otherwise null. We do not leak which dimension failed.
     */
    public function verify(string $identifier, string $otp, string $type): ?Otp
    {
        // SECURITY: Match by identifier + type + unused + non-expired,
        // then bcrypt-compare the submitted code to the stored hash.
        // Hash::check is constant-time relative to the hash, so timing
        // attacks against the bcrypt comparison itself are not useful.
        $candidates = Otp::where('identifier', $identifier)
            ->where('type', $type)
            ->where('is_used', false)
            ->where('expires_at', '>', Carbon::now())
            ->get();

        foreach ($candidates as $candidate) {
            if (Hash::check($otp, $candidate->otp)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * Send OTP via email.
     *
     * IMPORTANT: pass the *plaintext* OTP here (the value from
     * $otp->getAttribute('plaintext_otp') — only valid until the request ends).
     * Never reconstruct from the DB; the DB only has the hash.
     */
    public function sendEmail(string $email, string $otp, string $purpose = 'CART Email Verification'): bool
    {
        try {
            // Prefer the queue when available; fall back to sync send.
            if (class_exists(SendOtpEmail::class)) {
                SendOtpEmail::dispatch($email, $otp, $purpose);
            } else {
                Mail::to($email)->send(new \App\Mail\OtpMail($otp, $purpose));
            }

            // SECURITY: Never log the OTP value itself.
            Log::info('OTP email dispatched', [
                'email' => $email,
                'purpose' => $purpose,
            ]);
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send OTP to {$email}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Synchronous send (rarely needed; queue is preferred).
     * SECURITY: Same logging discipline as sendEmail — never log OTP value.
     */
    public function sendEmailSync(string $email, string $otp, string $purpose = 'CART Email Verification'): bool
    {
        try {
            Mail::to($email)->send(new \App\Mail\OtpMail($otp, $purpose));
            Log::info('OTP email sent (sync)', [
                'email' => $email,
                'purpose' => $purpose,
            ]);
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send OTP to {$email}: " . $e->getMessage());
            return false;
        }
    }
}
