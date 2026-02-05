<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserLoginHistory extends Model
{
    protected $table = 'user_login_history';

    protected $fillable = [
        'user_id',
        'ip_address',
        'user_agent',
        'device_type',
        'device_name',
        'browser',
        'os',
        'country',
        'city',
        'is_new_device',
        'is_suspicious',
        'notification_sent',
        'logged_in_at',
    ];

    protected $casts = [
        'is_new_device' => 'boolean',
        'is_suspicious' => 'boolean',
        'notification_sent' => 'boolean',
        'logged_in_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Record a new login.
     */
    public static function recordLogin(
        int $userId,
        string $ipAddress,
        ?string $userAgent = null
    ): self {
        // Parse user agent
        $deviceInfo = self::parseUserAgent($userAgent);

        // Check if this is a new device
        $isNewDevice = !self::where('user_id', $userId)
            ->where('device_name', $deviceInfo['device_name'])
            ->where('browser', $deviceInfo['browser'])
            ->exists();

        // Check for suspicious activity (e.g., different country)
        $lastLogin = self::where('user_id', $userId)
            ->orderBy('logged_in_at', 'desc')
            ->first();

        $isSuspicious = false;
        if ($lastLogin) {
            // If login from different country within 1 hour
            $location = self::getLocationFromIp($ipAddress);
            if ($lastLogin->country && $location['country'] !== $lastLogin->country) {
                $hoursSinceLastLogin = $lastLogin->logged_in_at->diffInHours(now());
                if ($hoursSinceLastLogin < 1) {
                    $isSuspicious = true;
                }
            }
        }

        $location = self::getLocationFromIp($ipAddress);

        return self::create([
            'user_id' => $userId,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'device_type' => $deviceInfo['device_type'],
            'device_name' => $deviceInfo['device_name'],
            'browser' => $deviceInfo['browser'],
            'os' => $deviceInfo['os'],
            'country' => $location['country'],
            'city' => $location['city'],
            'is_new_device' => $isNewDevice,
            'is_suspicious' => $isSuspicious,
            'notification_sent' => false,
            'logged_in_at' => now(),
        ]);
    }

    /**
     * Parse user agent string.
     */
    protected static function parseUserAgent(?string $userAgent): array
    {
        $result = [
            'device_type' => 'unknown',
            'device_name' => 'Unknown Device',
            'browser' => 'Unknown',
            'os' => 'Unknown',
        ];

        if (!$userAgent) return $result;

        // Detect device type
        if (preg_match('/mobile|android|iphone|ipad/i', $userAgent)) {
            $result['device_type'] = 'mobile';
        } elseif (preg_match('/tablet/i', $userAgent)) {
            $result['device_type'] = 'tablet';
        } else {
            $result['device_type'] = 'desktop';
        }

        // Detect OS
        if (preg_match('/android/i', $userAgent)) {
            $result['os'] = 'Android';
            $result['device_name'] = 'Android Device';
        } elseif (preg_match('/iphone/i', $userAgent)) {
            $result['os'] = 'iOS';
            $result['device_name'] = 'iPhone';
        } elseif (preg_match('/ipad/i', $userAgent)) {
            $result['os'] = 'iOS';
            $result['device_name'] = 'iPad';
        } elseif (preg_match('/windows/i', $userAgent)) {
            $result['os'] = 'Windows';
            $result['device_name'] = 'Windows PC';
        } elseif (preg_match('/macintosh|mac os/i', $userAgent)) {
            $result['os'] = 'macOS';
            $result['device_name'] = 'Mac';
        } elseif (preg_match('/linux/i', $userAgent)) {
            $result['os'] = 'Linux';
            $result['device_name'] = 'Linux PC';
        }

        // Detect browser
        if (preg_match('/chrome/i', $userAgent)) {
            $result['browser'] = 'Chrome';
        } elseif (preg_match('/safari/i', $userAgent)) {
            $result['browser'] = 'Safari';
        } elseif (preg_match('/firefox/i', $userAgent)) {
            $result['browser'] = 'Firefox';
        } elseif (preg_match('/edge/i', $userAgent)) {
            $result['browser'] = 'Edge';
        }

        return $result;
    }

    /**
     * Get location from IP address.
     * Note: In production, use a service like ip-api.com or maxmind
     */
    protected static function getLocationFromIp(string $ipAddress): array
    {
        // For now, return default values
        // In production, integrate with IP geolocation service
        return [
            'country' => null,
            'city' => null,
        ];
    }

    /**
     * Mark notification as sent.
     */
    public function markNotificationSent(): void
    {
        $this->update(['notification_sent' => true]);
    }

    /**
     * Get recent logins for a user.
     */
    public static function getRecentForUser(int $userId, int $limit = 10): \Illuminate\Database\Eloquent\Collection
    {
        return self::where('user_id', $userId)
            ->orderBy('logged_in_at', 'desc')
            ->limit($limit)
            ->get();
    }
}
