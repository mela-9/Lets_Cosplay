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
    Schema::create('costumes', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('series');
        $table->string('origin')->nullable();
        $table->string('category');
        $table->json('size'); // Menyimpan array ['S', 'M', 'L']
        $table->decimal('price', 12, 2);
        $table->decimal('deposit', 12, 2);
        $table->integer('stock')->default(1);
        $table->decimal('rating', 3, 2)->default(5.0);
        $table->integer('reviews')->default(0);
        $table->string('tag')->nullable();
        $table->text('image');
        $table->text('description')->nullable();
        $table->json('accessories')->nullable();
        $table->json('themes')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('costumes');
    }
};
