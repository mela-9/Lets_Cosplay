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
    private const MAX_UNITS = 50;

    /** Admin: semua pesanan (beserta foto dokumen). Penyewa: hanya pesanan miliknya. */
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        $query = Order::query()->with(['user:id,id_status', 'review'])->latest('id');
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
            // Banyak ukuran dalam satu pesanan: [{size:'M', qty:2}, {size:'L', qty:1}]
            'items' => 'required|array|min:1|max:10',
            'items.*.size' => 'required|string|max:10',
            'items.*.qty' => 'required|integer|min:1|max:'.self::MAX_UNITS,
            // Pesanan kelompok (tim / seragam bersama)
            'isGroup' => 'nullable|boolean',
            'groupName' => 'nullable|required_if:isGroup,true|string|max:80',
            'groupMembers' => 'nullable|string|max:2000',
            'rulesAccepted' => 'nullable|boolean',
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

        // Aturan rental harus sudah disetujui (di halaman Aturan atau lewat centang di checkout).
        if (!$user->rules_accepted_at) {
            if (empty($data['rulesAccepted'])) {
                return response()->json(['message' => 'Setujui Aturan Rental terlebih dahulu.'], 422);
            }
            $user->forceFill(['rules_accepted_at' => now()])->save();
        }

        // Gabungkan ukuran yang dobel, lalu hitung total unit.
        $items = [];
        foreach ($data['items'] as $row) {
            $size = mb_strtoupper(trim($row['size']));
            $items[$size] = ($items[$size] ?? 0) + (int) $row['qty'];
        }
        $items = collect($items)->map(fn ($qty, $size) => ['size' => (string) $size, 'qty' => $qty])->values()->all();
        $units = array_sum(array_column($items, 'qty'));

        if ($units > self::MAX_UNITS) {
            return response()->json(['message' => 'Maksimal '.self::MAX_UNITS.' kostum per pesanan.'], 422);
        }
        $isGroup = (bool) ($data['isGroup'] ?? false);
        if ($isGroup && $units < 2) {
            return response()->json(['message' => 'Pesanan kelompok minimal 2 kostum. Tambah jumlah di pilihan ukuran.'], 422);
        }

        // Lengkapi profil yang masih kosong (akun lama), tanpa menimpa data yang sudah ada.
        $hadSelfie = !empty($user->id_selfie);
        $user->fill(array_filter([
            'phone' => $user->phone ? null : ($data['phone'] ?? null),
            'social_platform' => $user->social_platform ? null : ($data['socialPlatform'] ?? null),
            'social_handle' => $user->social_handle ? null : ($data['socialHandle'] ?? null),
            'guarantor_phone' => $user->guarantor_phone ? null : ($data['guarantor'] ?? null),
            'id_selfie' => $user->id_selfie ? null : ($data['idSelfie'] ?? null),
            'id_selfie_name' => $user->id_selfie ? null : ($data['idSelfieName'] ?? null),
            'address' => $user->address ?: $data['address'],
        ]));
        if (!$hadSelfie && !empty($user->id_selfie)) {
            $user->resetIdVerification();
        }
        $user->save();

        $missing = collect([
            'phone' => 'Nomor telepon', 'social_platform' => 'Media sosial', 'social_handle' => 'Username media sosial',
            'guarantor_phone' => 'Nomor penjamin', 'id_selfie' => 'Foto selfie identitas',
        ])->filter(fn ($label, $field) => empty($user->{$field}))->values();

        if ($missing->isNotEmpty()) {
            return response()->json(['message' => 'Lengkapi data diri: '.$missing->implode(', ').'.'], 422);
        }

        if ($user->id_status === 'rejected') {
            return response()->json(['message' => 'Verifikasi KTP/identitasmu ditolak admin'.($user->id_reject_reason ? " ({$user->id_reject_reason})" : '').'. Unggah ulang foto di Pengaturan akun.'], 422);
        }

        try {
            $order = DB::transaction(function () use ($user, $data, $items, $units, $isGroup) {
                $costume = Costume::lockForUpdate()->findOrFail($data['productId']);

                // Stok dicek per ukuran × jumlah.
                foreach ($items as $item) {
                    if (!array_key_exists($item['size'], $costume->size_stock ?? [])) {
                        abort(response()->json(['message' => "Ukuran {$item['size']} tidak tersedia untuk kostum ini."], 422));
                    }
                    $left = $costume->stockFor($item['size']);
                    if ($left < $item['qty']) {
                        $msg = $left < 1
                            ? "Maaf, stok ukuran {$item['size']} sedang habis."
                            : "Stok ukuran {$item['size']} tersisa {$left} unit (kamu memilih {$item['qty']}).";
                        abort(response()->json(['message' => $msg], 422));
                    }
                }

                // Harga dihitung ulang di server; angka dari browser tidak dipercaya.
                $addons = array_values(array_unique($data['addons'] ?? []));
                $addonPerDay = array_sum(array_map(fn ($a) => self::ADDON_PRICE[$a], $addons));
                $trust = $user->trustScore();
                $depositEach = (int) ceil($costume->deposit * ($trust >= 85 ? 0.5 : 1));
                $deposit = $depositEach * $units;
                $total = (int) (($costume->price + $addonPerDay) * $data['days'] * $units + self::SHIPPING + $deposit);
                $minDp = (int) ceil($total * 0.5);

                if ($data['dp'] < $minDp || $data['dp'] > $total) {
                    abort(response()->json(['message' => "DP harus antara Rp{$minDp} dan Rp{$total}."], 422));
                }

                foreach ($items as $item) {
                    $costume->adjustStock($item['size'], -$item['qty']);
                }
                $costume->save();

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
                    'size' => Order::summarizeItems($items),
                    'items' => $items,
                    'quantity' => $units,
                    'is_group' => $isGroup,
                    'group_name' => $isGroup ? trim($data['groupName']) : null,
                    'group_members' => $isGroup ? (trim((string) ($data['groupMembers'] ?? '')) ?: null) : null,
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

        return response()->json(['status' => 'success', 'order' => $order->load(['user:id,id_status', 'review'])->toFront()], 201);
    }

    /** Admin: ubah tahap pesanan dan/atau nomor resi. Stok dikembalikan saat pesanan selesai. */
    public function update(Request $request, string $code)
    {
        $data = $request->validate([
            'stage' => 'sometimes|integer|min:0|max:7',
            'trackingNumber' => 'sometimes|nullable|string|max:60',
        ]);

        $order = Order::with(['user:id,id_status', 'review'])->where('order_code', $code)->firstOrFail();

        // KTP penyewa harus sudah diverifikasi sebelum pesanan boleh diproses.
        $targetStage = $data['stage'] ?? null;
        if (array_key_exists('trackingNumber', $data) && $data['trackingNumber'] && $order->stage < 3) {
            $targetStage = max((int) $targetStage, 3);
        }
        if ($targetStage !== null && $targetStage >= 2 && $order->stage < 2 && $order->user && $order->user->id_status !== 'verified') {
            return response()->json(['message' => 'Verifikasi KTP penyewa terlebih dahulu (menu Verifikasi KTP) sebelum memproses pesanan.'], 422);
        }

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
