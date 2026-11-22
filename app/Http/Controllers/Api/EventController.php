<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventSubmissionToken;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class EventController extends Controller
{
    private const PROMOTION_PRICES = [
        15 => 45000,
        30 => 85000,
        45 => 125000,
        60 => 175000,
        75 => 225000,
        90 => 325000,
    ];

    public function options()
    {
        return response()->json([
            'promotionPlans' => collect(self::PROMOTION_PRICES)
                ->map(fn (int $price, int $days) => ['days' => $days, 'price' => $price])
                ->values(),
            'aiAvailable' => (bool) config('services.gemini.api_key'),
            'paymentInstructions' => 'Informasi rekening/e-wallet admin akan diumumkan sebelum pembayaran nyata. Untuk saat ini, alur ini adalah simulasi verifikasi bukti transfer.',
        ]);
    }

    public function issueSubmissionToken(string $tier)
    {
        abort_unless(in_array($tier, ['free', 'paid'], true), 404);

        $token = Str::random(48);
        EventSubmissionToken::create([
            'token_hash' => hash('sha256', $token),
            'tier' => $tier === 'free' ? 'Gratis' : 'Prabayar',
        ]);

        return response()->json(['token' => $token]);
    }

    public function index(Request $request)
    {
        self::expireUnreviewedPayments();

        $isAdmin = $request->user()?->role === 'admin';
        $query = Event::query();

        if (!$isAdmin) {
            $ids = array_filter(array_map('intval', explode(',', (string) $request->query('ids'))));
            $query->where(function ($q) use ($ids) {
                $q->where(function ($approved) {
                    $approved->where('status', 'Disetujui')
                        ->where(fn ($listing) => $listing->whereNull('listing_until')->orWhere('listing_until', '>', now()));
                });
                if ($ids) {
                    $q->orWhereIn('id', array_slice($ids, 0, 30));
                }
            });
        }

        return response()->json(
            $query->orderByDesc('featured')->orderByDesc('id')->get()
                ->map(fn (Event $event) => $event->toFront($isAdmin))->values()
        );
    }

    public function draft(Request $request)
    {
        $data = $request->validate([
            'poster' => ['required', 'string', 'max:3000000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
            'pdf' => ['required', 'string', 'max:3000000', 'regex:/^data:application\/pdf;base64,/'],
        ]);

        $parts = [
            ['text' => 'Kamu adalah editor iklan event yang faktual dan copywriter profesional. Baca poster dan PDF. Ambil hanya fakta yang memang tertulis, satukan info penting yang ada di PDF tetapi tidak ada di poster, dan jangan menyalin kalimat panjang dari PDF. Tulis description sebagai ringkasan faktual maksimal 2 kalimat. Tulis eventInformation sebagai poin ringkas untuk info penting tambahan seperti jam, tiket/harga, pendaftaran, kontak, syarat usia, atau fasilitas; hanya masukkan yang tercantum di dokumen dan jangan ulangi judul/tanggal/lokasi. Tulis copywriting promosi orisinal, maksimal 2 kalimat atau 280 karakter, bukan rangkuman panjang dan bukan salinan sumber; jangan mengarang ajakan/tautan/harga. highlightText maksimal 8 kata. themeRecommendation singkat. Jika data penting untuk pengunjung (waktu, tiket/pendaftaran, kontak) tidak ditemukan pada kedua file, buat maksimal 3 followUpQuestions untuk ditanyakan chatbot; selain itu array kosong. Kembalikan hanya JSON dengan properti title, date, location, theme, description, eventInformation, highlightText, copywriting, themeRecommendation, accentColor, followUpQuestions. Untuk fakta yang tidak ada, gunakan string kosong; followUpQuestions berupa array string. accentColor harus kode hex. Bahasa Indonesia.'],
            $this->inlineData($data['poster']),
            $this->inlineData($data['pdf']),
        ];

        return $this->geminiJson($parts);
    }

    public function recommendations(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:200',
            'date' => 'nullable|string|max:60',
            'location' => 'nullable|string|max:200',
            'theme' => 'nullable|string|max:200',
            'description' => 'nullable|string|max:2000',
            'eventInformation' => 'nullable|string|max:1200',
        ]);

        $parts = [[
            'text' => 'Buat materi iklan event yang ringkas dan orisinal dari fakta terkonfirmasi berikut: '.json_encode($data, JSON_UNESCAPED_UNICODE).
                '. Jangan menyalin atau mengulang kalimat sumber. Copywriting harus maksimal 2 kalimat dan 280 karakter, menarik tetapi faktual. Jangan membuat tautan, harga, tanggal, atau janji yang tidak diberikan. Kembalikan hanya JSON dengan properti highlightText (maksimal 8 kata), copywriting, themeRecommendation (saran visual singkat), accentColor (kode hex kontras).',
        ]];

        return $this->geminiJson($parts);
    }

    public function consult(Request $request)
    {
        $data = $request->validate([
            'message' => 'required|string|max:1000',
            'event' => 'required|array',
            'event.title' => 'nullable|string|max:200',
            'event.date' => 'nullable|string|max:60',
            'event.location' => 'nullable|string|max:200',
            'event.theme' => 'nullable|string|max:200',
            'event.description' => 'nullable|string|max:2000',
            'event.eventInformation' => 'nullable|string|max:1200',
        ]);

        return $this->geminiText(
            'Kamu konsultan event cosplay yang ramah. Jawab dalam bahasa Indonesia secara ringkas, berdasarkan detail event berikut. Jangan mengarang informasi yang tidak tersedia; jika perlu, ajukan satu pertanyaan klarifikasi. Detail event: '.json_encode($data['event'], JSON_UNESCAPED_UNICODE),
            $data['message']
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'submissionToken' => 'required|string|size:48',
            'title' => 'required|string|max:200',
            'date' => 'required|string|max:60',
            'location' => 'required|string|max:200',
            'theme' => 'required|string|max:200',
            'description' => 'required|string|max:2000',
            'eventInformation' => 'nullable|string|max:1200',
            'tier' => 'required|in:Gratis,Prabayar',
            'image' => ['required', 'string', 'max:3000000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
            'eventPdfName' => 'nullable|string|max:150',
            'eventPdf' => ['nullable', 'string', 'max:3000000', 'regex:/^data:application\/pdf;base64,/'],
            'promotionDays' => 'required_if:tier,Prabayar|nullable|integer|in:15,30,45,60,75,90',
            'copywriting' => 'nullable|string|max:2000',
            'highlightText' => 'nullable|string|max:120',
            'accentColor' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'themeRecommendation' => 'nullable|string|max:120',
            'correctionRequest' => 'nullable|string|max:1000',
            'organizerEmail' => 'required|email|max:200',
            'organizerPhone' => 'nullable|string|max:40',
            'paymentProofName' => 'required_if:tier,Prabayar|nullable|string|max:150',
            'paymentProofImage' => ['required_if:tier,Prabayar', 'nullable', 'string', 'max:3000000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
            'refundBankName' => 'required_if:tier,Prabayar|nullable|string|max:100',
            'refundAccountNumber' => 'required_if:tier,Prabayar|nullable|string|max:80',
            'refundAccountHolder' => 'required_if:tier,Prabayar|nullable|string|max:150',
            'termsAccepted' => 'accepted',
        ], [
            'termsAccepted.accepted' => 'Persetujuan ketentuan promosi wajib dicentang.',
            'eventPdf.required' => 'PDF rincian event wajib diunggah untuk paket Prabayar.',
            'paymentProofImage.required_if' => 'Bukti transfer wajib diunggah untuk paket Prabayar.',
        ]);

        if ($data['tier'] === 'Prabayar' && empty($data['eventPdf'])) {
            return response()->json(['message' => 'PDF rincian event wajib diunggah untuk paket Prabayar.'], 422);
        }

        $expectedTier = $data['tier'];
        $token = EventSubmissionToken::query()
            ->where('token_hash', hash('sha256', $data['submissionToken']))
            ->where('tier', $expectedTier)
            ->whereNull('event_id')
            ->whereNull('consumed_at')
            ->first();

        if (!$token) {
            return response()->json(['message' => 'Tautan pengajuan ini sudah digunakan atau tidak berlaku. Buka kembali QR untuk memulai pengajuan baru.'], 409);
        }

        $promotionDays = $expectedTier === 'Prabayar' ? (int) $data['promotionDays'] : 0;
        $promotionPrice = $promotionDays ? self::PROMOTION_PRICES[$promotionDays] : 0;
        $event = DB::transaction(function () use ($data, $token, $promotionDays, $promotionPrice) {
            $event = Event::create([
                'title' => $data['title'],
                'date' => $data['date'],
                'location' => $data['location'],
                'theme' => $data['theme'],
                'category' => 'Komunitas',
                'tier' => $data['tier'],
                'status' => 'Menunggu review',
                'image' => $data['image'],
                'description' => $data['description'],
                'event_information' => $data['eventInformation'] ?? null,
                'featured' => false,
                'payment_proof_name' => $data['paymentProofName'] ?? null,
                'payment_proof_image' => $data['paymentProofImage'] ?? null,
                'terms_accepted' => true,
                'organizer_email' => $data['organizerEmail'],
                'organizer_phone' => $data['organizerPhone'] ?? null,
                'refund_bank_name' => $data['refundBankName'] ?? null,
                'refund_account_number' => $data['refundAccountNumber'] ?? null,
                'refund_account_holder' => $data['refundAccountHolder'] ?? null,
                'event_pdf_name' => $data['eventPdfName'] ?? null,
                'event_pdf' => $data['eventPdf'] ?? null,
                'promotion_days' => $promotionDays ?: 15,
                'promotion_price' => $promotionPrice,
                'copywriting' => $data['copywriting'] ?? null,
                'highlight_text' => $data['highlightText'] ?? null,
                'accent_color' => $data['accentColor'] ?? '#F45193',
                'theme_recommendation' => $data['themeRecommendation'] ?? null,
                'correction_request' => $data['correctionRequest'] ?? null,
                'payment_status' => $data['tier'] === 'Prabayar' ? 'Menunggu verifikasi' : 'Tidak ada',
                'wallet_status' => $data['tier'] === 'Prabayar' ? 'Belum masuk (simulasi)' : 'Belum ada',
                'amount_paid' => $promotionPrice,
                'payment_submitted_at' => $data['tier'] === 'Prabayar' ? now() : null,
                'payment_review_deadline_at' => $data['tier'] === 'Prabayar' ? now()->addHours(72) : null,
            ]);

            $token->update(['event_id' => $event->id]);

            return $event;
        });

        return response()->json(['status' => 'success', 'event' => $event->toFront()], 201);
    }

    public function update(Request $request, Event $event)
    {
        self::expireUnreviewedPayments();
        $event->refresh();
        $data = $request->validate([
            'status' => 'sometimes|in:Disetujui,Ditolak',
            'featured' => 'sometimes|boolean',
            'refundStatus' => 'sometimes|in:Sudah dikembalikan',
            'refundProofName' => 'nullable|string|max:150',
            'refundProofImage' => ['nullable', 'string', 'max:3000000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
        ]);

        if (array_key_exists('refundStatus', $data)) {
            if ($event->payment_status !== 'Refund perlu diproses') {
                return response()->json(['message' => 'Tidak ada refund yang menunggu untuk event ini.'], 422);
            }
            $event->refund_status = $data['refundStatus'];
            $event->refund_proof_name = $data['refundProofName'] ?? null;
            $event->refund_proof_image = $data['refundProofImage'] ?? null;
            $event->payment_status = 'Refund selesai';
            $event->wallet_status = 'Refund ditransfer manual';
        }

        if (isset($data['status'])) {
            $isPendingReview = $event->status === 'Menunggu review';
            $isTakingDown = $event->status === 'Disetujui' && $data['status'] === 'Ditolak';
            if (!$isPendingReview && !$isTakingDown) {
                return response()->json(['message' => 'Pengajuan ini sudah ditinjau.'], 409);
            }

            if ($data['status'] === 'Disetujui') {
                if (!$isPendingReview || ($event->tier === 'Prabayar' && $event->payment_status !== 'Menunggu verifikasi')) {
                    return response()->json(['message' => 'Pembayaran tidak lagi menunggu verifikasi.'], 422);
                }
                $event->status = 'Disetujui';
                $event->featured = $event->tier === 'Prabayar';
                $event->approved_at = now();
                if ($event->tier === 'Prabayar') {
                    $event->payment_status = 'Terverifikasi';
                    $event->wallet_status = 'Dana diterima (simulasi)';
                    $event->listing_until = now()->addDays($event->promotion_days);
                }
                EventSubmissionToken::where('event_id', $event->id)->update(['consumed_at' => now()]);
            } elseif ($isPendingReview) {
                $event->status = 'Ditolak';
                $event->featured = false;
                if ($event->tier === 'Prabayar') {
                    $event->payment_status = 'Refund perlu diproses';
                    $event->wallet_status = 'Tidak dikreditkan (simulasi)';
                    $event->refund_amount = (int) round($event->amount_paid * 0.97);
                    $event->refund_status = 'Menunggu proses manual';
                    $event->refund_reason = 'Pengajuan ditolak admin; potongan 3% dari pembayaran.';
                }
            } else {
                $event->status = 'Ditolak';
                $event->featured = false;
            }
        }

        if (array_key_exists('featured', $data) && $event->status === 'Disetujui') {
            $event->featured = $data['featured'];
        }

        $event->save();

        return response()->json(['status' => 'success', 'event' => $event->toFront(true)]);
    }

    public function destroy(Event $event)
    {
        $event->delete();

        return response()->json(['status' => 'success', 'message' => 'Event berhasil dihapus.']);
    }

    public static function expireUnreviewedPayments(): int
    {
        return Event::query()
            ->where('tier', 'Prabayar')
            ->where('status', 'Menunggu review')
            ->where('payment_status', 'Menunggu verifikasi')
            ->whereNotNull('payment_review_deadline_at')
            ->where('payment_review_deadline_at', '<=', now())
            ->update([
                'status' => 'Ditolak',
                'featured' => false,
                'payment_status' => 'Refund perlu diproses',
                'wallet_status' => 'Tidak dikreditkan (simulasi)',
                'refund_amount' => DB::raw('amount_paid'),
                'refund_status' => 'Menunggu proses manual',
                'refund_reason' => 'Tidak ada respons admin dalam 3×24 jam; refund penuh.',
                'updated_at' => now(),
            ]);
    }

    private function inlineData(string $dataUrl): array
    {
        preg_match('/^data:([^;]+);base64,(.+)$/s', $dataUrl, $matches);

        return ['inlineData' => ['mimeType' => $matches[1], 'data' => $matches[2]]];
    }

    private function geminiJson(array $parts)
    {
        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            return response()->json(['message' => 'AI belum aktif. Admin perlu memasang GEMINI_API_KEY di konfigurasi server sebelum iklan Prabayar dapat dibuat.'], 503);
        }

        $response = $this->sendGemini($apiKey, [
            'systemInstruction' => ['parts' => [['text' => 'Kamu membantu pemilik event cosplay menyiapkan informasi iklan yang akurat. Jangan menambah fakta yang tidak ada pada dokumen.']]],
            'contents' => [['role' => 'user', 'parts' => $parts]],
            'generationConfig' => [
                'temperature' => 0.4,
                'maxOutputTokens' => 1200,
                'responseMimeType' => 'application/json',
            ],
        ]);

        if ($response instanceof \Illuminate\Http\JsonResponse) {
            return $response;
        }

        $text = trim((string) data_get($response->json(), 'candidates.0.content.parts.0.text', ''));
        $result = json_decode($text, true);
        if (!is_array($result)) {
            Log::warning('Gemini returned invalid event JSON.');

            return response()->json(['message' => 'AI mengembalikan hasil yang tidak dapat dibaca. Periksa file atau coba lagi.'], 502);
        }

        return response()->json(['draft' => $result]);
    }

    private function geminiText(string $systemPrompt, string $message)
    {
        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            return response()->json(['message' => 'Konsultan AI belum aktif. Admin perlu memasang GEMINI_API_KEY di konfigurasi server.'], 503);
        }

        $response = $this->sendGemini($apiKey, [
            'systemInstruction' => ['parts' => [['text' => $systemPrompt]]],
            'contents' => [['role' => 'user', 'parts' => [['text' => $message]]]],
            'generationConfig' => ['temperature' => 0.7, 'maxOutputTokens' => 500],
        ]);

        if ($response instanceof \Illuminate\Http\JsonResponse) {
            return $response;
        }

        $reply = trim((string) data_get($response->json(), 'candidates.0.content.parts.0.text', ''));
        if ($reply === '') {
            return response()->json(['message' => 'Konsultan AI tidak menghasilkan jawaban. Coba lagi.'], 502);
        }

        return response()->json(['reply' => $reply]);
    }

    private function sendGemini(string $apiKey, array $payload)
    {
        $model = config('services.gemini.model', 'gemini-2.5-flash');
        if (str_contains($model, '2.5-flash')) {
            $payload['generationConfig']['thinkingConfig'] = ['thinkingBudget' => 0];
        }

        try {
            $response = Http::withHeaders(['x-goog-api-key' => $apiKey])
                ->timeout(45)
                ->retry(2, 600, fn ($exception) => $exception instanceof ConnectionException, throw: false)
                ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", $payload);
        } catch (ConnectionException $exception) {
            Log::warning('Gemini unavailable for event workflow: '.$exception->getMessage());

            return response()->json(['message' => 'Tidak dapat terhubung ke Gemini. Periksa koneksi server lalu coba lagi.'], 502);
        }

        if (!$response->successful()) {
            Log::warning('Gemini event workflow error '.$response->status().': '.$response->body());

            return response()->json(['message' => 'Layanan Gemini gagal memproses permintaan ('.$response->status().').'], 502);
        }

        return $response;
    }
}
