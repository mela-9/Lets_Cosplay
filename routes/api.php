<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CostumeController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\IdentityController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ReviewController;
use Illuminate\Support\Facades\Route;

// ---- Auth ----
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::middleware('token')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/password', [AuthController::class, 'updatePassword']);
    Route::post('/rules/accept', [AuthController::class, 'acceptRules'])->middleware('role:customer');
});

// ---- Costumes: katalog publik, kelola oleh admin ----
Route::get('/costumes', [CostumeController::class, 'index']);
Route::get('/costumes/{costume}/reviews', [ReviewController::class, 'forCostume']);
Route::middleware(['token', 'role:admin'])->group(function () {
    Route::post('/costumes', [CostumeController::class, 'store']);
    Route::put('/costumes/{costume}', [CostumeController::class, 'update']);
    Route::delete('/costumes/{costume}', [CostumeController::class, 'destroy']);
    Route::patch('/costumes/{costume}/stock', [CostumeController::class, 'adjustStock']);
});

// ---- Events: publik hanya yang disetujui; organizer tanpa akun boleh mengajukan ----
Route::get('/events', [EventController::class, 'index'])->middleware('token:optional');
Route::get('/events/options', [EventController::class, 'options']);
Route::post('/events/submission-token/{tier}', [EventController::class, 'issueSubmissionToken'])->middleware('throttle:30,1');
Route::post('/events/ai-draft', [EventController::class, 'draft'])->middleware('throttle:5,1');
Route::post('/events/recommendations', [EventController::class, 'recommendations'])->middleware('throttle:10,1');
Route::post('/events/consult', [EventController::class, 'consult'])->middleware('throttle:30,1');
Route::post('/events', [EventController::class, 'store'])->middleware('throttle:10,1');
Route::middleware(['token', 'role:admin'])->group(function () {
    Route::patch('/events/{event}', [EventController::class, 'update']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);
});

// ---- Orders ----
// ---- Orders & Payment Accounts ----
Route::get('/payment-accounts', [OrderController::class, 'paymentAccounts']);
Route::middleware('token')->group(function () {
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store'])->middleware('role:customer');
    Route::post('/orders/{code}/settle', [OrderController::class, 'settle'])->middleware('role:customer');
    Route::post('/orders/{code}/return', [OrderController::class, 'submitReturn'])->middleware('role:customer');
    Route::patch('/orders/{code}', [OrderController::class, 'update'])->middleware('role:admin');
    Route::put('/payment-accounts', [OrderController::class, 'updatePaymentAccounts'])->middleware('role:admin');

    // Ulasan: penyewa menulis, penjual (admin) membalas
    Route::post('/orders/{code}/review', [ReviewController::class, 'store'])->middleware('role:customer');
});

// ---- Admin: verifikasi KTP & ulasan ----
Route::middleware(['token', 'role:admin'])->group(function () {
    Route::get('/identities', [IdentityController::class, 'index']);
    Route::get('/identities/{user}', [IdentityController::class, 'show']);
    Route::patch('/identities/{user}', [IdentityController::class, 'review']);
    Route::get('/reviews', [ReviewController::class, 'index']);
    Route::patch('/reviews/{review}/reply', [ReviewController::class, 'reply']);
});

// ---- Chatbot (Gemini) ----
Route::post('/chat', [ChatController::class, 'reply'])->middleware(['token:optional', 'throttle:30,1']);
