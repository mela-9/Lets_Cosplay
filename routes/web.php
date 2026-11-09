<?php

use Illuminate\Support\Facades\Route;
use App\Models\Event;
use App\Http\Controllers\EventController;
use App\Http\Controllers\CostumeController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrderController;

// 1. HALAMAN UTAMA (Memanggil lets_cosplay.blade.php dan mengirim variabel $events)
Route::get('/', function () {
    $events = Event::where('status', 'Disetujui')->get();
    return view('lets_cosplay', compact('events'));
});

// 2. ENDPOINT API (Sesuai panggilan fetch() di lets-cosplay.js)
Route::prefix('api')->group(function () {
    // Auth API
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);

    // Orders API
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);

    // Events API
    Route::get('/events', [EventController::class, 'index']);
    Route::post('/events', [EventController::class, 'store']);
    Route::post('/events/upload', [EventController::class, 'store']);
    Route::delete('/events/{id}', [EventController::class, 'destroy']);

    // Costumes API
    Route::get('/costumes', [CostumeController::class, 'index']);
    Route::post('/costumes', [CostumeController::class, 'store']);

    // Chatbot API
    Route::post('/chat', [ChatController::class, 'reply']);
    Route::post('/chat/reply', [ChatController::class, 'reply']);
});