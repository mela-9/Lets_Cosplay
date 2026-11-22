<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Pilihan skema di awal checkout: 'dp' (DP 50%) atau 'full' (Langsung Lunas 100%)
            if (!Schema::hasColumn('orders', 'payment_scheme')) {
                $table->string('payment_scheme')->default('full');
            }

            // Kolom terpisah untuk bukti DP dan bukti pelunasan agar tidak saling menimpa
            if (!Schema::hasColumn('orders', 'dp_proof')) {
                $table->longText('dp_proof')->nullable();
            }
            if (!Schema::hasColumn('orders', 'settlement_proof')) {
                $table->longText('settlement_proof')->nullable();
            }

            // Tahapan status pembayaran: 'unpaid', 'dp_submitted', 'dp_verified', 'settlement_submitted', 'paid_full'
            if (!Schema::hasColumn('orders', 'payment_stage')) {
                $table->string('payment_stage')->default('unpaid');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach (['payment_scheme', 'dp_proof', 'settlement_proof', 'payment_stage'] as $column) {
                if (Schema::hasColumn('orders', $column)) {
                    $columnsToDrop[] = $column;
                }
            }

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};