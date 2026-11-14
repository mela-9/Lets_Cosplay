<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CostumeController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\OrderController;
use Illuminate\Support\Facades\Route;

// ---- Auth ----
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::middleware('token')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

// ---- Costumes: katalog publik, kelola oleh admin ----
Route::get('/costumes', [CostumeController::class, 'index']);
Route::middleware(['token', 'role:admin'])->group(function () {
    Route::post('/costumes', [CostumeController::class, 'store']);
    Route::put('/costumes/{costume}', [CostumeController::class, 'update']);
    Route::delete('/costumes/{costume}', [CostumeController::class, 'destroy']);
});

// ---- Events: publik hanya yang disetujui; organizer tanpa akun boleh mengajukan ----
Route::get('/events', [EventController::class, 'index'])->middleware('token:optional');
Route::post('/events', [EventController::class, 'store'])->middleware('throttle:10,1');
Route::middleware(['token', 'role:admin'])->group(function () {
    Route::patch('/events/{event}', [EventController::class, 'update']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);
});

// ---- Orders ----
Route::middleware('token')->group(function () {
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store'])->middleware('role:customer');
    Route::patch('/orders/{code}', [OrderController::class, 'update'])->middleware('role:admin');
});

// ---- Chatbot (Gemini) ----
Route::post('/chat', [ChatController::class, 'reply'])->middleware(['token:optional', 'throttle:30,1']);
