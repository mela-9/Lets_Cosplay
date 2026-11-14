<?php

use Illuminate\Support\Facades\Route;
use App\Models\Event;
use App\Models\Costume;

Route::get('/', function () {
    // Mengambil data dari SQLite (dengan fallback array kosong jika data belum terisi)
    $events = class_exists(Event::class) ? Event::all() : [];
    $costumes = class_exists(Costume::class) ? Costume::all() : [];

    return view('lets_cosplay', [
        'events' => $events,
        'costumes' => $costumes,
    ]);
});