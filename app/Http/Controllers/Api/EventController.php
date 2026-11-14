<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;

class EventController extends Controller
{
    /**
     * Publik  : hanya event "Disetujui" (+ event milik organizer lewat ?ids=1,2 untuk cek status pengajuan).
     * Admin   : semua event beserta bukti pembayaran.
     */
    public function index(Request $request)
    {
        $isAdmin = $request->user()?->role === 'admin';
        $query = Event::query();

        if (!$isAdmin) {
            $ids = array_filter(array_map('intval', explode(',', (string) $request->query('ids'))));
            $query->where(function ($q) use ($ids) {
                $q->where('status', 'Disetujui');
                if ($ids) {
                    $q->orWhereIn('id', array_slice($ids, 0, 30));
                }
            });
        }

        return response()->json(
            $query->orderByDesc('featured')->orderByDesc('id')->get()
                ->map(fn (Event $e) => $e->toFront($isAdmin))->values()
        );
    }

    /** Pengajuan iklan event dari organizer (tanpa akun, via QR). Selalu masuk antrean review. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:200',
            'date' => 'required|string|max:60',
            'location' => 'required|string|max:200',
            'theme' => 'required|string|max:200',
            'tier' => 'required|in:Gratis,Prabayar',
            'image' => ['nullable', 'string', 'max:3500000', 'regex:/^(data:image\/(jpeg|png|webp);base64,|https?:\/\/)/'],
            'paymentProofName' => 'nullable|string|max:150',
            'paymentProofImage' => ['nullable', 'string', 'max:3500000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
            'termsAccepted' => 'accepted',
        ], [
            'termsAccepted.accepted' => 'Persetujuan ketentuan promosi wajib dicentang.',
        ]);

        if ($data['tier'] === 'Prabayar' && empty($data['paymentProofImage'])) {
            return response()->json(['message' => 'Bukti pembayaran wajib untuk paket prabayar.'], 422);
        }

        $event = Event::create([
            'title' => $data['title'],
            'date' => $data['date'],
            'location' => $data['location'],
            'theme' => $data['theme'],
            'category' => 'Komunitas',
            'tier' => $data['tier'],
            'status' => 'Menunggu review',
            'image' => $data['image'] ?? 'https://placehold.co/900x600/281824/ff4799?text='.urlencode($data['title']),
            'description' => "Event bertema {$data['theme']} di {$data['location']}.",
            'featured' => false,
            'payment_proof_name' => $data['paymentProofName'] ?? null,
            'payment_proof_image' => $data['paymentProofImage'] ?? null,
            'terms_accepted' => true,
        ]);

        return response()->json(['status' => 'success', 'event' => $event->toFront()], 201);
    }

    /** Admin: setujui / tolak (status) atau ubah sorotan (featured). */
    public function update(Request $request, Event $event)
    {
        $data = $request->validate([
            'status' => 'sometimes|in:Menunggu review,Disetujui,Ditolak',
            'featured' => 'sometimes|boolean',
        ]);

        if (($data['status'] ?? null) === 'Disetujui' && $event->tier === 'Prabayar' && !$event->payment_proof_image) {
            return response()->json(['message' => 'Bukti pembayaran prabayar belum tersedia.'], 422);
        }

        $event->fill($data);
        if (($data['status'] ?? null) === 'Disetujui' && !array_key_exists('featured', $data)) {
            $event->featured = $event->tier === 'Prabayar';
        }
        if (($data['status'] ?? null) && $data['status'] !== 'Disetujui') {
            $event->featured = false;
        }
        $event->save();

        return response()->json(['status' => 'success', 'event' => $event->toFront(true)]);
    }

    public function destroy(Event $event)
    {
        $event->delete();

        return response()->json(['status' => 'success', 'message' => 'Event berhasil dihapus.']);
    }
}
