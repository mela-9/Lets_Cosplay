<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Costume;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    private const SHIPPING = 18000;
    private const ADDON_PRICE = ['wig' => 35000, 'care' => 15000];

    /** Admin: semua pesanan (beserta foto dokumen). Penyewa: hanya pesanan miliknya. */
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        $query = Order::query()->latest('id');
        if (!$isAdmin) {
            $query->where('user_id', $user->id);
        }

        return response()->json($query->get()->map(fn (Order $o) => $o->toFront($isAdmin))->values());
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'productId' => 'required|integer|exists:costumes,id',
            'size' => 'required|string|max:10',
            'days' => 'required|integer|min:1|max:7',
            'rentalDate' => 'required|date|after_or_equal:today',
            'addons' => 'nullable|array',
            'addons.*' => 'in:wig,care',
            'dp' => 'required|integer|min:0',
            'paymentMethod' => 'required|in:Transfer bank,E-wallet',
            'address' => 'required|string|min:10|max:500',     // satu-satunya data yang boleh berbeda dari profil
            'paymentProofName' => 'nullable|string|max:150',
            'paymentProofImage' => ['required', 'string', 'max:3500000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
            // Hanya dipakai untuk melengkapi akun lama yang profilnya belum lengkap:
            'phone' => ['nullable', 'regex:/^\+?[0-9]{9,15}$/'],
            'socialPlatform' => 'nullable|in:Instagram,TikTok,X,Lainnya',
            'socialHandle' => 'nullable|string|max:60',
            'guarantor' => ['nullable', 'regex:/^\+?[0-9]{9,15}$/'],
            'idSelfie' => ['nullable', 'string', 'max:3500000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
            'idSelfieName' => 'nullable|string|max:150',
        ]);

        // Lengkapi profil yang masih kosong (akun lama), tanpa menimpa data yang sudah ada.
        $user->fill(array_filter([
            'phone' => $user->phone ? null : ($data['phone'] ?? null),
            'social_platform' => $user->social_platform ? null : ($data['socialPlatform'] ?? null),
            'social_handle' => $user->social_handle ? null : ($data['socialHandle'] ?? null),
            'guarantor_phone' => $user->guarantor_phone ? null : ($data['guarantor'] ?? null),
            'id_selfie' => $user->id_selfie ? null : ($data['idSelfie'] ?? null),
            'id_selfie_name' => $user->id_selfie ? null : ($data['idSelfieName'] ?? null),
            'address' => $user->address ?: $data['address'],
        ]))->save();

        $missing = collect([
            'phone' => 'Nomor telepon', 'social_platform' => 'Media sosial', 'social_handle' => 'Username media sosial',
            'guarantor_phone' => 'Nomor penjamin', 'id_selfie' => 'Foto selfie identitas',
        ])->filter(fn ($label, $field) => empty($user->{$field}))->values();

        if ($missing->isNotEmpty()) {
            return response()->json(['message' => 'Lengkapi data diri: '.$missing->implode(', ').'.'], 422);
        }

        try {
            $order = DB::transaction(function () use ($user, $data) {
                $costume = Costume::lockForUpdate()->findOrFail($data['productId']);

                if ($costume->stock < 1) {
                    abort(response()->json(['message' => 'Maaf, stok kostum ini sedang habis.'], 422));
                }
                if (!in_array($data['size'], $costume->size ?? [], true)) {
                    abort(response()->json(['message' => 'Ukuran tidak tersedia untuk kostum ini.'], 422));
                }

                // Harga dihitung ulang di server; angka dari browser tidak dipercaya.
                $addons = array_values(array_unique($data['addons'] ?? []));
                $addonPerDay = array_sum(array_map(fn ($a) => self::ADDON_PRICE[$a], $addons));
                $trust = $user->trustScore();
                $deposit = (int) ceil($costume->deposit * ($trust >= 85 ? 0.5 : 1));
                $total = (int) (($costume->price + $addonPerDay) * $data['days'] + self::SHIPPING + $deposit);
                $minDp = (int) ceil($total * 0.5);

                if ($data['dp'] < $minDp || $data['dp'] > $total) {
                    abort(response()->json(['message' => "DP harus antara Rp{$minDp} dan Rp{$total}."], 422));
                }

                $costume->decrement('stock');

                return Order::create([
                    'order_code' => $this->newCode(),
                    'user_id' => $user->id,
                    'customer_name' => $user->name,
                    'customer_email' => $user->email,
                    'phone' => $user->phone,
                    'address' => $data['address'],
                    'social_platform' => $user->social_platform,
                    'social_handle' => $user->social_handle,
                    'guarantor_phone' => $user->guarantor_phone,
                    'costume_id' => $costume->id,
                    'costume_name' => $costume->name,
                    'costume_image' => $costume->image,
                    'size' => $data['size'],
                    'days' => $data['days'],
                    'addons' => $addons,
                    'rental_date' => $data['rentalDate'],
                    'deposit' => $deposit,
                    'total' => $total,
                    'dp' => $data['dp'],
                    'stage' => 0,
                    'bucket' => Order::bucketForStage(0),
                    'payment_method' => $data['paymentMethod'],
                    'id_selfie_name' => $user->id_selfie_name,
                    'id_selfie_image' => $user->id_selfie,
                    'payment_proof_name' => $data['paymentProofName'] ?? null,
                    'payment_proof_image' => $data['paymentProofImage'],
                    'trust_score' => $trust,
                    'stock_held' => true,
                ]);
            });
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            return $e->getResponse();
        }

        return response()->json(['status' => 'success', 'order' => $order->toFront()], 201);
    }

    /** Admin: ubah tahap pesanan dan/atau nomor resi. Stok dikembalikan saat pesanan selesai. */
    public function update(Request $request, string $code)
    {
        $data = $request->validate([
            'stage' => 'sometimes|integer|min:0|max:7',
            'trackingNumber' => 'sometimes|nullable|string|max:60',
        ]);

        $order = Order::where('order_code', $code)->firstOrFail();

        DB::transaction(function () use ($order, $data) {
            if (array_key_exists('stage', $data)) {
                $order->stage = $data['stage'];
                $order->bucket = Order::bucketForStage($data['stage']);
                if ($data['stage'] >= 7) {
                    $order->releaseStock();
                }
            }
            if (array_key_exists('trackingNumber', $data)) {
                $order->tracking_number = $data['trackingNumber'];
                if ($data['trackingNumber'] && $order->stage < 3) {
                    $order->stage = 3;
                    $order->bucket = Order::bucketForStage(3);
                }
            }
            $order->save();
        });

        return response()->json(['status' => 'success', 'order' => $order->toFront(true)]);
    }

    private function newCode(): string
    {
        do {
            $code = 'LC-'.random_int(10000000, 99999999);
        } while (Order::where('order_code', $code)->exists());

        return $code;
    }
}
