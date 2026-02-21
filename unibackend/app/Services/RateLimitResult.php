<?php

namespace App\Services;

/**
 * Rate Limit Check Result
 * 
 * Immutable value object holding the outcome of a rate limit check.
 * Contains everything needed to build the HTTP response.
 */
class RateLimitResult
{
    public function __construct(
        public readonly bool $allowed,
        public readonly int $remaining,
        public readonly int $limit,
        public readonly int $retryAfter,  // seconds until client can retry
        public readonly int $resetAt,     // unix timestamp when limit resets
        public readonly string $message,
        public ?string $policy = null,    // which policy matched
    ) {}

    /**
     * Create an "allowed" result.
     */
    public static function allowed(int $remaining, int $limit, ?string $policy = null): self
    {
        return new self(
            allowed: true,
            remaining: $remaining,
            limit: $limit,
            retryAfter: 0,
            resetAt: time() + 60,
            message: 'OK',
            policy: $policy,
        );
    }

    /**
     * Create a "blocked" result.
     */
    public static function blocked(
        string $message,
        int $remaining,
        int $retryAfter,
        ?string $policy = null,
        int $limit = 0,
    ): self {
        return new self(
            allowed: false,
            remaining: $remaining,
            limit: $limit,
            retryAfter: max(1, $retryAfter),
            resetAt: time() + max(1, $retryAfter),
            message: $message,
            policy: $policy,
        );
    }

    /**
     * Build standard rate limit headers for the HTTP response.
     */
    public function headers(): array
    {
        $config = config('rate-limiting.headers', []);
        if (!($config['enabled'] ?? true)) {
            return [];
        }

        $headers = [
            ($config['limit'] ?? 'X-RateLimit-Limit') => $this->limit,
            ($config['remaining'] ?? 'X-RateLimit-Remaining') => max(0, $this->remaining),
            ($config['reset'] ?? 'X-RateLimit-Reset') => $this->resetAt,
        ];

        if ($this->policy) {
            $headers[$config['policy'] ?? 'X-RateLimit-Policy'] = $this->policy;
        }

        if (!$this->allowed) {
            $headers[$config['retry_after'] ?? 'Retry-After'] = $this->retryAfter;
        }

        return $headers;
    }

    /**
     * Build the 429 JSON response body.
     */
    public function responseBody(): array
    {
        return [
            'success' => false,
            'message' => $this->message,
            'error_code' => 'RATE_LIMITED',
            'retry_after' => $this->retryAfter,
            'limit' => $this->limit,
            'remaining' => max(0, $this->remaining),
            'reset_at' => $this->resetAt,
            'policy' => $this->policy,
        ];
    }
}
