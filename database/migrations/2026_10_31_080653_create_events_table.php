<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('date');
            $table->string('location');
            $table->string('category')->default('Paid Promotion');
            $table->string('media_url')->nullable();
            $table->text('description');
            $table->string('signature')->default("Verified Official Event • Let'sCosplay Hub");
            $table->json('recommended_costumes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('events');
    }
};