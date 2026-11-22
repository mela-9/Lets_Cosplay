<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('final_payment_method')->nullable()->after('payment_proof_image');
            $table->string('final_payment_proof_name')->nullable()->after('final_payment_method');
            $table->longText('final_payment_proof_image')->nullable()->after('final_payment_proof_name');
            $table->timestamp('final_paid_at')->nullable()->after('final_payment_proof_image');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'final_payment_method',
                'final_payment_proof_name',
                'final_payment_proof_image',
                'final_paid_at',
            ]);
        });
    }
};