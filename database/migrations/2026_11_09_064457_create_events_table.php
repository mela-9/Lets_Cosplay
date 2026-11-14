<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Skema events lama (media_url, signature, ...) digantikan skema baru.
        // dropIfExists mencegah error "table events already exists" pada database lama.
        Schema::dropIfExists('events');

        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('date');
            $table->string('location');
            $table->string('theme');
            $table->string('category')->default('Komunitas');
            $table->enum('tier', ['Gratis', 'Prabayar'])->default('Gratis');
            $table->enum('status', ['Menunggu review', 'Disetujui', 'Ditolak'])->default('Menunggu review');
            $table->longText('image');
            $table->text('description')->nullable();
            $table->boolean('featured')->default(false);
            $table->string('payment_proof_name')->nullable();
            $table->longText('payment_proof_image')->nullable();
            $table->boolean('terms_accepted')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
