<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    public function chat(Request $request)
    {
        $userMessage = $request->input('message');
        $apiKey = env('GEMINI_API_KEY');

        if (!$apiKey) {
            return response()->json(['error' => 'API Key belum dikonfigurasi di .env'], 500);
        }

        // Panggilan langsung ke Gemini API
        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
        ])->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}", [
            'contents' => [
                [
                    'parts' => [
                        ['text' => "Kamu adalah Asisten AI ramah untuk toko rental kostum Let'sCosplay. Jawab pertanyaan pengguna secara ringkas, dinamis, dan membantu: " . $userMessage]
                    ]
                ]
            ]
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $reply = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
            if ($reply) {
                return response()->json(['reply' => $reply]);
            }
        }

        return response()->json(['error' => 'Gagal mendapatkan respon dari Gemini.'], 500);
    }
}