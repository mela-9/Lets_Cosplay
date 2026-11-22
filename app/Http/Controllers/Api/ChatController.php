<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\Costume;
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
            // Halaman yang sedang dibuka pengguna, supaya "kostum ini" / "yang ini" bisa dipahami.
            'context' => 'nullable|array',
            'context.page' => 'nullable|string|max:30',
            'context.productId' => 'nullable|string|max:20',
            'context.eventId' => 'nullable|string|max:20',
        ]);

        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            return response()->json(['message' => 'GEMINI_API_KEY belum diatur di .env'], 503);
        }

        $model = config('services.gemini.model', 'gemini-2.5-flash');
        $payload = [
            'systemInstruction' => ['parts' => [['text' => ChatContext::systemPrompt($request->user(), $data['context'] ?? [])]]],
            'contents' => $this->contents($data['history'] ?? [], $data['message']),
            'generationConfig' => [
                'temperature' => 0.8,
                'topP' => 0.95,
                // JSON terstruktur: balasan + saran lanjutan + kartu kostum, dalam satu panggilan.
                'responseMimeType' => 'application/json',
                'responseSchema' => $this->schema(),
                'maxOutputTokens' => 1024,
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
        $raw = trim(collect($parts)->pluck('text')->filter()->implode(''));

        if ($raw === '') {
            $blocked = $json['promptFeedback']['blockReason'] ?? ($json['candidates'][0]['finishReason'] ?? 'EMPTY');
            Log::info('Gemini empty reply: '.$blocked);

            return response()->json(['message' => 'Balasan kosong dari Gemini.'], 502);
        }

        $out = $this->parseStructured($raw);
        if ($out['reply'] === '') {
            return response()->json(['message' => 'Balasan kosong dari Gemini.'], 502);
        }

        $this->remember($data['sessionId'] ?? null, $data['message'], $out['reply']);

        return response()->json([
            'reply' => $out['reply'],
            'suggestions' => $out['suggestions'],
            'costumeIds' => $this->validCostumeIds($out['costumeIds']),
            'source' => 'gemini',
        ]);
    }

    /** Skema JSON yang diminta dari Gemini. */
    private function schema(): array
    {
        return [
            'type' => 'OBJECT',
            'properties' => [
                'reply' => ['type' => 'STRING'],
                'suggestions' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                'costume_ids' => ['type' => 'ARRAY', 'items' => ['type' => 'INTEGER']],
            ],
            'required' => ['reply'],
            'propertyOrdering' => ['reply', 'suggestions', 'costume_ids'],
        ];
    }

    /**
     * Baca balasan terstruktur. Jika model mengirim teks biasa / JSON terpotong,
     * tetap ambil teksnya agar pengguna tidak melihat error.
     */
    private function parseStructured(string $raw): array
    {
        $clean = trim(preg_replace('/^```(?:json)?\s*|\s*```$/i', '', $raw));
        $decoded = json_decode($clean, true);

        if (is_array($decoded) && isset($decoded['reply']) && is_string($decoded['reply'])) {
            $suggestions = collect($decoded['suggestions'] ?? [])
                ->filter(fn ($s) => is_string($s) && trim($s) !== '')
                ->map(fn ($s) => mb_substr(trim($s), 0, 48))
                ->unique()->take(3)->values()->all();

            return [
                'reply' => trim($decoded['reply']),
                'suggestions' => $suggestions,
                'costumeIds' => array_values(array_filter((array) ($decoded['costume_ids'] ?? []), 'is_numeric')),
            ];
        }

        // JSON terpotong (mis. kena batas token): ambil isi "reply" saja bila ada.
        if (preg_match('/"reply"\s*:\s*"((?:[^"\\\\]|\\\\.)*)/s', $clean, $m)) {
            $text = json_decode('"'.$m[1].'"');
            if (is_string($text) && trim($text) !== '') {
                return ['reply' => trim($text), 'suggestions' => [], 'costumeIds' => []];
            }
        }

        // Bukan JSON sama sekali → anggap teks biasa. Jika tampak seperti JSON rusak, kosongkan
        // agar klien memakai jawaban cadangan, bukan menampilkan kurung kurawal mentah.
        $plain = str_starts_with($clean, '{') ? '' : $clean;

        return ['reply' => $plain, 'suggestions' => [], 'costumeIds' => []];
    }

    /** Hanya ID kostum yang benar-benar ada di database (maks. 3). */
    private function validCostumeIds(array $ids): array
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));
        if (!$ids) {
            return [];
        }
        $found = Costume::whereIn('id', array_slice($ids, 0, 6))->pluck('id')->all();

        return array_values(array_slice(array_values(array_intersect($ids, $found)), 0, 3));
    }

    /** Susun riwayat: harus diawali "user" dan bergantian role (syarat Gemini). */
    private function contents(array $history, string $message): array
    {
        $turns = [];
        foreach (array_slice($history, -12) as $h) {
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
