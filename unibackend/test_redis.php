<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    \Illuminate\Support\Facades\Cache::store('redis')->put('test_key', 'hello_redis', 60);
    $val = \Illuminate\Support\Facades\Cache::store('redis')->get('test_key');
    echo "Redis cache working: " . $val . "\n";
    
    // Test default cache (should now be redis)
    \Illuminate\Support\Facades\Cache::put('default_test', 'default_redis', 60);
    echo "Default cache store: " . config('cache.default') . "\n";
    echo "Default cache value: " . \Illuminate\Support\Facades\Cache::get('default_test') . "\n";
    
    // Test session driver
    echo "Session driver: " . config('session.driver') . "\n";
    echo "Queue connection: " . config('queue.default') . "\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
