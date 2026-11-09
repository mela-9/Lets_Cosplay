<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EventController;
use App\Http\Controllers\CostumeController;

// Rute utama ini sudah benar memanggil controller
Route::get('/', [EventController::class, 'index']);

// Endpoint API untuk upload dan hapus event
Route::post('/api/events/upload', [EventController::class, 'store']);
Route::delete('/api/events/{id}', [EventController::class, 'destroy']);

Route::get('/costumes', [CostumeController::class, 'index']);
Route::post('/costumes', [CostumeController::class, 'store']);