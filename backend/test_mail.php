<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Config;

// Set stream options to bypass SSL verification (for testing only)
Config::set('mail.mailers.smtp.stream', [
    'ssl' => [
        'allow_self_signed' => true,
        'verify_peer' => false,
        'verify_peer_name' => false,
    ],
]);

Config::set('mail.mailers.smtp.encryption', env('MAIL_ENCRYPTION', 'tls'));

try {
    Mail::raw('This is a test email from ElBaraka app.', function ($message) {
        $message->to('kareemhesham105@gmail.com')
                ->subject('ElBaraka - Test Email');
    });
    
    echo "✅ Email sent successfully! Check your inbox at kareemhesham105@gmail.com\n";
} catch (\Exception $e) {
    echo "❌ Error sending email: " . $e->getMessage() . "\n";
    echo "Error details: " . $e->getTraceAsString() . "\n";
}
