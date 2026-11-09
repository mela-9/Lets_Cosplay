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
    Schema::create('orders', function (Blueprint $table) {
        $table->id();
        $table->string('order_code')->unique(); // e.g. LC-12345678
        $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
        $table->string('customer_name');
        $table->string('customer_email');
        $table->string('phone');
        $table->text('address');
        $table->string('social_platform')->nullable();
        $table->string('social_handle')->nullable();
        $table->string('guarantor_phone')->nullable();
        $table->foreignId('costume_id')->nullable(); // Menghubungkan ke tabel costumes
        $table->string('size');
        $table->integer('days');
        $table->date('rental_date');
        $table->integer('deposit');
        $table->integer('total');
        $table->integer('dp');
        $table->integer('stage')->default(0);
        $table->string('bucket')->default('Menunggu verifikasi');
        $table->string('tracking_number')->nullable();
        $table->string('payment_method')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
