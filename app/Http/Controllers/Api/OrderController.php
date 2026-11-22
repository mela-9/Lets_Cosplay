<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Costume;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class OrderController extends Controller
{
    private const SHIPPING_PALEMBANG = 15000;
    private const SHIPPING_OUTSIDE = 30000;
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
            'items' => 'required|array|min:1|max:10',
            'items.*.size' => 'required|string|max:10',
            'items.*.qty' => 'required|integer|min:1|max:'.self::MAX_UNITS,
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
            'address' => 'required|string|min:10|max:500',
            'paymentProofName' => 'nullable|string|max:150',
            'paymentProofImage' => ['required', 'string', 'max:3500000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
            'phone' => ['nullable', 'regex:/^\+?[0-9]{9,15}$/'],
            'socialPlatform' => 'nullable|in:Instagram,TikTok,X,Lainnya',
            'socialHandle' => 'nullable|string|max:60',
            'guarantor' => ['nullable', 'regex:/^\+?[0-9]{9,15}$/'],
            'idSelfie' => ['nullable', 'string', 'max:3500000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
            'idSelfieName' => 'nullable|string|max:150',
        ]);

        if (!$user->rules_accepted_at) {
            if (empty($data['rulesAccepted'])) {
                return response()->json(['message' => 'Setujui Aturan Rental terlebih dahulu.'], 422);
            }
            $user->forceFill(['rules_accepted_at' => now()])->save();
        }

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

                $addons = array_values(array_unique($data['addons'] ?? []));
                $addonPerDay = array_sum(array_map(fn ($a) => self::ADDON_PRICE[$a], $addons));
                $trust = $user->trustScore();
                $depositEach = (int) ceil($costume->deposit * ($trust >= 85 ? 0.5 : 1));
                $deposit = $depositEach * $units;
                $shipping = str_contains(mb_strtolower($data['address']), 'palembang')
                    ? self::SHIPPING_PALEMBANG
                    : self::SHIPPING_OUTSIDE;
                $total = (int) (($costume->price + $addonPerDay) * $data['days'] * $units + $shipping + $deposit);
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

    /** Admin: ubah tahap pesanan, jadwal kirim, tunda kirim, dan/atau nomor resi. */
    public function update(Request $request, string $code)
    {
        $data = $request->validate([
            'stage' => 'sometimes|integer|min:0|max:7',
            'trackingNumber' => 'sometimes|nullable|string|max:60',
            'estimatedShipDate' => 'sometimes|nullable|date',
            'shippingHoldReason' => 'sometimes|nullable|string|max:255',
        ]);

        $order = Order::with(['user:id,id_status', 'review'])->where('order_code', $code)->firstOrFail();
        $isPaidOff = ($order->dp >= $order->total) || !empty($order->final_payment_proof_image);

        $targetStage = $data['stage'] ?? null;
        if (array_key_exists('trackingNumber', $data) && $data['trackingNumber'] && $order->stage < 3) {
            $targetStage = max((int) $targetStage, 3);
        }

        if ($targetStage !== null && $targetStage >= 2 && $order->stage < 2 && $order->user && $order->user->id_status !== 'verified') {
            return response()->json(['message' => 'Verifikasi KTP penyewa terlebih dahulu (menu Verifikasi KTP) sebelum memproses pesanan.'], 422);
        }

        if ($targetStage !== null && $targetStage >= 3 && !$isPaidOff) {
            return response()->json(['message' => 'Pembayaran belum lunas! Gunakan "Tunda Kirim" sampai penyewa mengunggah bukti pelunasan.'], 422);
        }

        // Pengembalian kostum wajib disertai resi & foto paket retur dari penyewa sebelum diselesaikan
        if ($targetStage !== null && $targetStage >= 7 && (empty($order->return_tracking_number) || empty($order->return_proof_image))) {
            return response()->json(['message' => 'Penyewa belum mengunggah nomor resi dan foto paket pengembalian kostum.'], 422);
        }

        DB::transaction(function () use ($order, $data) {
            if (array_key_exists('estimatedShipDate', $data)) {
                $order->estimated_ship_date = $data['estimatedShipDate'];
            }
            if (array_key_exists('shippingHoldReason', $data)) {
                $order->shipping_hold_reason = $data['shippingHoldReason'] ?: null;
            }
            if (array_key_exists('stage', $data)) {
                $order->stage = $data['stage'];
                $order->bucket = Order::bucketForStage($data['stage']);
                if ($data['stage'] >= 3) {
                    $order->shipping_hold_reason = null;
                }
                if ($data['stage'] >= 7) {
                    $order->releaseStock();
                }
            }
            if (array_key_exists('trackingNumber', $data)) {
                $order->tracking_number = $data['trackingNumber'];
                if ($data['trackingNumber'] && $order->stage < 3) {
                    $order->stage = 3;
                    $order->bucket = Order::bucketForStage(3);
                    $order->shipping_hold_reason = null;
                }
            }
            $order->save();
        });

        return response()->json(['status' => 'success', 'order' => $order->toFront(true)]);
    }

    /** Penyewa: unggah bukti pelunasan sisa tagihan DP. */
    public function settle(Request $request, string $code)
    {
        $user = $request->user();
        $order = Order::with(['user:id,id_status', 'review'])
            ->where('order_code', $code)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if ($order->dp >= $order->total) {
            return response()->json(['message' => 'Pesanan ini sudah dibayar lunas sejak awal.'], 422);
        }

        $data = $request->validate([
            'paymentMethod' => 'required|in:Transfer bank,E-wallet',
            'proofName' => 'nullable|string|max:150',
            'proofImage' => ['required', 'string', 'max:3500000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
        ]);

        $order->forceFill([
         'final_payment_method' => $data['paymentMethod'],
         'final_payment_proof_name' => $data['proofName'] ?? null,
         'final_payment_proof_image' => $data['proofImage'],
         'final_paid_at' => now(),
         'shipping_hold_reason' => null,
        ])->save();
        return response()->json([
            'status' => 'success',
            'order' => $order->toFront(),
        ]);
    }

    /** Penyewa: input nomor resi & foto bukti pengembalian kostum. */
    public function submitReturn(Request $request, string $code)
    {
        $user = $request->user();
        $order = Order::with(['user:id,id_status', 'review'])
            ->where('order_code', $code)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if ($order->stage < 5) {
            return response()->json(['message' => 'Kostum belum diterima, pengembalian belum bisa dicatat.'], 422);
        }

        $data = $request->validate([
            'returnTrackingNumber' => 'required|string|min:4|max:60',
            'returnProofName' => 'nullable|string|max:150',
            'returnProofImage' => ['required', 'string', 'max:3500000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
        ]);

        $order->forceFill([
            'return_tracking_number' => trim($data['returnTrackingNumber']),
            'return_proof_name' => $data['returnProofName'] ?? null,
            'return_proof_image' => $data['returnProofImage'],
            'returned_at' => now(),
            'stage' => max((int) $order->stage, 6),
            'bucket' => Order::bucketForStage(max((int) $order->stage, 6)),
        ])->save();

        return response()->json([
            'status' => 'success',
            'order' => $order->toFront(),
        ]);
    }

    /** Publik/Penyewa & Admin: ambil daftar rekening bank, e-wallet, & alamat retur toko. */
    public function paymentAccounts()
    {
        $default = [
            'bank' => [
                ['provider' => 'BCA', 'number' => '8530123456', 'holder' => 'LetsCosplay Studio'],
                ['provider' => 'Mandiri', 'number' => '1120098765432', 'holder' => 'LetsCosplay Studio'],
            ],
            'ewallet' => [
                ['provider' => 'DANA / GoPay / OVO', 'number' => '081278901234', 'holder' => 'LetsCosplay Palembang'],
            ],
            'returnAddress' => [
                'recipient' => 'LetsCosplay Studio',
                'phone' => '081278901234',
                'address' => 'Palembang, Sumatera Selatan',
            ],
        ];

        if (Storage::disk('local')->exists('payment-accounts.json')) {
            $saved = json_decode(Storage::disk('local')->get('payment-accounts.json'), true);
            if (is_array($saved)) {
                $saved['returnAddress'] = array_merge($default['returnAddress'], $saved['returnAddress'] ?? []);
                return response()->json($saved);
            }
        }

        return response()->json($default);
    }

    /** Admin: simpan perubahan rekening bank, e-wallet, & alamat retur toko. */
    public function updatePaymentAccounts(Request $request)
    {
        $data = $request->validate([
            'bank' => 'required|array|min:1|max:5',
            'bank.*.provider' => 'required|string|max:40',
            'bank.*.number' => 'required|string|max:40',
            'bank.*.holder' => 'required|string|max:80',
            'ewallet' => 'required|array|min:1|max:5',
            'ewallet.*.provider' => 'required|string|max:40',
            'ewallet.*.number' => 'required|string|max:40',
            'ewallet.*.holder' => 'required|string|max:80',
            'returnAddress' => 'required|array',
            'returnAddress.recipient' => 'required|string|max:80',
            'returnAddress.phone' => 'required|string|max:30',
            'returnAddress.address' => 'required|string|max:300',
        ]);

        Storage::disk('local')->put('payment-accounts.json', json_encode($data, JSON_PRETTY_PRINT));

        return response()->json(['status' => 'success', 'accounts' => $data]);
    }

    private function newCode(): string
    {
        do {
            $code = 'LC-'.random_int(10000000, 99999999);
        } while (Order::where('order_code', $code)->exists());

        return $code;
    }
}