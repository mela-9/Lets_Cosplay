<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Services\ChatContext;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    public function reply(Request $request)
    {
        $data = $request->validate([
            'message' => 'required|string|max:1000',
            'sessionId' => 'nullable|string|max:64',
            'history' => 'nullable|array|max:20',
            'history.*.role' => 'in:user,bot',
            'history.*.text' => 'string|max:2000',
        ]);

        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            return response()->json(['message' => 'GEMINI_API_KEY belum diatur di .env'], 503);
        }

        $model = config('services.gemini.model', 'gemini-2.5-flash');
        $payload = [
            'systemInstruction' => ['parts' => [['text' => ChatContext::systemPrompt($request->user())]]],
            'contents' => $this->contents($data['history'] ?? [], $data['message']),
            'generationConfig' => [
                'temperature' => 0.85,
                'topP' => 0.95,
                'maxOutputTokens' => 700,
            ],
        ];
        // Model 2.5 Flash "berpikir" dulu secara default → lambat untuk chat. Matikan agar balasan cepat.
        if (str_contains($model, '2.5-flash')) {
            $payload['generationConfig']['thinkingConfig'] = ['thinkingBudget' => 0];
        }

        try {
            $response = Http::withHeaders(['x-goog-api-key' => $apiKey])
                ->timeout(25)
                ->retry(2, 600, function ($e) {
                    return $e instanceof ConnectionException
                        || ($e instanceof RequestException && in_array($e->response->status(), [429, 500, 502, 503, 504]));
                }, throw: false)
                ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", $payload);
        } catch (\Throwable $e) {
            Log::warning('Gemini unreachable: '.$e->getMessage());

            return response()->json(['message' => 'Tidak dapat terhubung ke Gemini.'], 502);
        }

        if (!$response->successful()) {
            Log::warning('Gemini error '.$response->status().': '.$response->body());

            return response()->json(['message' => 'Gemini menolak permintaan ('.$response->status().').'], 502);
        }

        $json = $response->json();
        $parts = $json['candidates'][0]['content']['parts'] ?? [];
        $reply = trim(collect($parts)->pluck('text')->filter()->implode(''));

        if ($reply === '') {
            $blocked = $json['promptFeedback']['blockReason'] ?? ($json['candidates'][0]['finishReason'] ?? 'EMPTY');
            Log::info('Gemini empty reply: '.$blocked);

            return response()->json(['message' => 'Balasan kosong dari Gemini.'], 502);
        }

        $this->remember($data['sessionId'] ?? null, $data['message'], $reply);

        return response()->json(['reply' => $reply, 'source' => 'gemini']);
    }

    /** Susun riwayat: harus diawali "user" dan bergantian role (syarat Gemini). */
    private function contents(array $history, string $message): array
    {
        $turns = [];
        foreach (array_slice($history, -10) as $h) {
            $role = ($h['role'] ?? '') === 'bot' ? 'model' : 'user';
            $text = trim((string) ($h['text'] ?? ''));
            if ($text === '') {
                continue;
            }
            if ($turns && end($turns)['role'] === $role) {
                $turns[count($turns) - 1]['parts'][0]['text'] .= "\n".$text;
            } else {
                $turns[] = ['role' => $role, 'parts' => [['text' => $text]]];
            }
        }
        while ($turns && $turns[0]['role'] !== 'user') {
            array_shift($turns);
        }
        // Pesan terbaru dari klien sudah ada di akhir history? Hindari duplikat.
        $last = $turns ? end($turns) : null;
        if ($last && $last['role'] === 'user' && trim($last['parts'][0]['text']) === trim($message)) {
            array_pop($turns);
        }
        if ($turns && end($turns)['role'] === 'user') {
            $turns[count($turns) - 1]['parts'][0]['text'] .= "\n".$message;
        } else {
            $turns[] = ['role' => 'user', 'parts' => [['text' => $message]]];
        }

        return $turns;
    }

    private function remember(?string $sessionId, string $question, string $answer): void
    {
        try {
            ChatMessage::insert([
                ['session_id' => $sessionId, 'role' => 'user', 'message' => $question, 'created_at' => now(), 'updated_at' => now()],
                ['session_id' => $sessionId, 'role' => 'bot', 'message' => $answer, 'created_at' => now(), 'updated_at' => now()],
            ]);
        } catch (\Throwable $e) {
            Log::debug('Chat log skipped: '.$e->getMessage());
        }
    }
}
