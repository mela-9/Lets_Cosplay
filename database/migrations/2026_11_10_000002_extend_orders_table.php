<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'costume_name')) {
                $table->string('costume_name')->nullable();      // snapshot, tetap tampil walau kostum dihapus
                $table->text('costume_image')->nullable();
                $table->json('addons')->nullable();
                $table->string('id_selfie_name')->nullable();
                $table->longText('id_selfie_image')->nullable();
                $table->string('payment_proof_name')->nullable();
                $table->longText('payment_proof_image')->nullable();
                $table->unsignedTinyInteger('trust_score')->default(55);
                $table->boolean('stock_held')->default(true);     // true = 1 unit stok sedang ditahan pesanan ini
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'costume_name', 'costume_image', 'addons', 'id_selfie_name', 'id_selfie_image',
                'payment_proof_name', 'payment_proof_image', 'trust_score', 'stock_held',
            ]);
        });
    }
};
