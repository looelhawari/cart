<?php

namespace App\Console\Commands;

use App\Services\PendingRegistrationService;
use Illuminate\Console\Command;

class CleanupExpiredPendingRegistrations extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'registrations:cleanup';

    /**
     * The console command description.
     */
    protected $description = 'Delete expired pending registrations from DB and Redis';

    /**
     * Execute the console command.
     */
    public function handle(PendingRegistrationService $service): int
    {
        $count = $service->cleanupExpired();

        if ($count > 0) {
            $this->info("Cleaned up {$count} expired pending registration(s).");
        } else {
            $this->info('No expired pending registrations found.');
        }

        return self::SUCCESS;
    }
}
