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
    Schema::create('events', function (Blueprint $table) {
        $table->id();
        $table->string('title');
        $table->string('date');
        $table->string('location');
        $table->string('theme');
        $table->string('category')->default('Komunitas');
        $table->enum('tier', ['Gratis', 'Prabayar'])->default('Gratis');
        $table->enum('status', ['Menunggu review', 'Disetujui', 'Ditolak'])->default('Disetujui');
        $table->text('image');
        $table->text('description')->nullable();
        $table->boolean('featured')->default(false);
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
