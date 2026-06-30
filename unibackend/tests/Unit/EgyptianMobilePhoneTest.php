<?php

namespace Tests\Unit;

use App\Support\EgyptianMobilePhone;
use PHPUnit\Framework\TestCase;

class EgyptianMobilePhoneTest extends TestCase
{
    public function test_valid_egyptian_mobile_formats_are_normalized(): void
    {
        $cases = [
            '01012345678' => '+201012345678',
            '01112345678' => '+201112345678',
            '01212345678' => '+201212345678',
            '01512345678' => '+201512345678',
            '1012345678' => '+201012345678',
            '1112345678' => '+201112345678',
            '1212345678' => '+201212345678',
            '1512345678' => '+201512345678',
            '+201012345678' => '+201012345678',
            '201012345678' => '+201012345678',
            '010 1234 5678' => '+201012345678',
            '010-1234-5678' => '+201012345678',
        ];

        foreach ($cases as $input => $expected) {
            $this->assertSame($expected, EgyptianMobilePhone::normalize($input));
        }
    }

    public function test_invalid_egyptian_mobile_numbers_are_rejected(): void
    {
        $cases = [
            '',
            '   ',
            '010abc45678',
            '021012345678',
            '01312345678',
            '01412345678',
            '01612345678',
            '01712345678',
            '01812345678',
            '01912345678',
            '0101234567',
            '010123456789',
            '01000000000',
            '01111111111',
            '01222222222',
            '01555555555',
            '+20+1012345678',
        ];

        foreach ($cases as $input) {
            $this->assertNull(EgyptianMobilePhone::normalize($input), "Input should be invalid: {$input}");
        }
    }

    public function test_variants_cover_legacy_stored_formats(): void
    {
        $this->assertSame(
            ['+201012345678', '201012345678', '01012345678', '1012345678'],
            EgyptianMobilePhone::variants('+201012345678')
        );
    }
}
