<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Foto kostum kini bisa berupa data URL (hasil unggahan admin) → kolom perlu longText di MySQL/Postgres.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('costumes', fn (Blueprint $t) => $t->longText('image')->change());
        Schema::table('orders', fn (Blueprint $t) => $t->longText('costume_image')->nullable()->change());
    }

    public function down(): void
    {
        // dibiarkan: mengecilkan kolom dapat memotong data.
    }
};
