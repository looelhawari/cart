<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$columns = DB::select('DESCRIBE delivery_zones');
foreach ($columns as $col) {
    echo $col->Field . ' | ' . $col->Type . "\n";
}
