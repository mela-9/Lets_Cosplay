<?php

use App\Models\Event;
use Illuminate\Support\Facades\Route;

// Single Page App: ambil data events dan kirim ke view lets_cosplay
Route::get('/', function () {
    $events = Event::all();
    return view('lets_cosplay', compact('events'));
});
