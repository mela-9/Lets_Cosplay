<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EventController;

// Rute utama ini sudah benar memanggil controller
Route::get('/', [EventController::class, 'index']);

// Endpoint API untuk upload dan hapus event
Route::post('/api/events/upload', [EventController::class, 'store']);
Route::delete('/api/events/{id}', [EventController::class, 'destroy']);