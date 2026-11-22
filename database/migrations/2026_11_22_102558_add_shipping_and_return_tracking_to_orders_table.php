<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->date('estimated_ship_date')->nullable()->after('tracking_number');
            $table->string('shipping_hold_reason')->nullable()->after('estimated_ship_date');
            $table->string('return_tracking_number')->nullable()->after('shipping_hold_reason');
            $table->timestamp('returned_at')->nullable()->after('return_tracking_number');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'estimated_ship_date',
                'shipping_hold_reason',
                'return_tracking_number',
                'returned_at',
            ]);
        });
    }
};