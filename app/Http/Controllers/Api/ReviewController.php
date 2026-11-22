<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Costume;
use App\Models\Order;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /** Publik: ulasan satu kostum (terbaru dulu) + ringkasan bintang. */
    public function forCostume(Costume $costume)
    {
        $reviews = Review::with('order')->where('costume_id', $costume->id)->latest('id')->get();
        $dist = array_fill_keys([5, 4, 3, 2, 1], 0);
        foreach ($reviews as $r) {
            $dist[$r->rating]++;
        }

        return response()->json([
            'average' => $reviews->count() ? round($reviews->avg('rating'), 1) : null,
            'count' => $reviews->count(),
            'distribution' => $dist,
            'reviews' => $reviews->map(fn (Review $r) => $r->toFront())->values(),
        ]);
    }

    /** Penyewa: beri atau ubah ulasan untuk pesanannya yang sudah selesai. */
    public function store(Request $request, string $code)
    {
        $user = $request->user();
        $order = Order::where('order_code', $code)->where('user_id', $user->id)->firstOrFail();

        if ($order->stage < 7) {
            return response()->json(['message' => 'Ulasan bisa diberikan setelah kostum dikembalikan dan pesanan selesai.'], 422);
        }

        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ], ['rating.required' => 'Pilih jumlah bintang dulu.', 'rating.min' => 'Pilih jumlah bintang dulu.']);

        $review = Review::updateOrCreate(
            ['order_id' => $order->id],
            [
                'user_id' => $user->id,
                'costume_id' => $order->costume_id,
                'rating' => $data['rating'],
                'comment' => trim((string) ($data['comment'] ?? '')) ?: null,
            ],
        );

        $order->costume?->refreshRating();
        $review->setRelation('order', $order);

        return response()->json(['status' => 'success', 'review' => $review->toFront()]);
    }

    /** Admin/penjual: semua ulasan masuk. */
    public function index()
    {
        $reviews = Review::with('order')->latest('id')->get();

        return response()->json([
            'average' => $reviews->count() ? round($reviews->avg('rating'), 1) : null,
            'reviews' => $reviews->map(fn (Review $r) => $r->toFront(true))->values(),
        ]);
    }

    /** Admin/penjual: balas ulasan (balasan kosong = hapus balasan). */
    public function reply(Request $request, Review $review)
    {
        $data = $request->validate(['reply' => 'nullable|string|max:1000']);
        $text = trim((string) ($data['reply'] ?? ''));

        $review->update([
            'reply' => $text ?: null,
            'replied_at' => $text ? now() : null,
        ]);
        $review->load('order');

        return response()->json(['status' => 'success', 'review' => $review->toFront(true)]);
    }
}
