<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\EventController;
use Illuminate\Console\Command;

class ExpireUnreviewedEventPayments extends Command
{
    protected $signature = 'events:expire-unreviewed-payments';

    protected $description = 'Mark paid event applications without an admin response after 72 hours for full refund.';

    public function handle(): int
    {
        $count = EventController::expireUnreviewedPayments();
        $this->info("Processed {$count} expired event payment(s).");

        return self::SUCCESS;
    }
}
