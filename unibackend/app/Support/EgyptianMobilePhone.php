<?php

namespace App\Support;

class EgyptianMobilePhone
{
    private const VALID_PREFIXES = ['10', '11', '12', '15'];

    public static function normalize(?string $value): ?string
    {
        $raw = trim((string) $value);

        if ($raw === '' || preg_match('/\p{L}/u', $raw)) {
            return null;
        }

        $compact = preg_replace('/[\s\-\(\)\[\]\.]/', '', $raw);

        if (! is_string($compact) || ! preg_match('/^\+?\d+$/', $compact)) {
            return null;
        }

        if (substr_count($compact, '+') > 1 || (str_contains($compact, '+') && ! str_starts_with($compact, '+'))) {
            return null;
        }

        $digits = ltrim($compact, '+');

        if (str_starts_with($digits, '20')) {
            $local = substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $local = substr($digits, 1);
        } else {
            $local = $digits;
        }

        if (! preg_match('/^(' . implode('|', self::VALID_PREFIXES) . ')\d{8}$/', $local)) {
            return null;
        }

        if (self::hasRepeatedSubscriberDigits($local)) {
            return null;
        }

        return '+20' . $local;
    }

    public static function variants(string $normalized): array
    {
        $canonical = self::normalize($normalized);

        if ($canonical === null) {
            return [];
        }

        $local = substr($canonical, 3);

        return array_values(array_unique([
            $canonical,
            '20' . $local,
            '0' . $local,
            $local,
        ]));
    }

    private static function hasRepeatedSubscriberDigits(string $local): bool
    {
        $subscriber = substr($local, 2);

        return count(array_unique(str_split($subscriber))) === 1;
    }
}
