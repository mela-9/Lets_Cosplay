<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    public const STAGES = [
        'Pesanan Dibuat', 'Pembayaran Diverifikasi', 'Diproses', 'Dikirim JNE',
        'Dalam Perjalanan', 'Diterima', 'Masa Sewa', 'Dikembalikan / Selesai',
    ];

    protected $fillable = [
        'order_code', 'user_id', 'customer_name', 'customer_email', 'phone', 'address',
        'social_platform', 'social_handle', 'guarantor_phone',
        'costume_id', 'costume_name', 'costume_image', 'size', 'days', 'addons',
        'rental_date', 'deposit', 'total', 'dp', 'stage', 'bucket', 'tracking_number',
        'payment_method', 'id_selfie_name', 'id_selfie_image',
        'payment_proof_name', 'payment_proof_image', 'trust_score', 'stock_held',
        'items', 'quantity', 'is_group', 'group_name', 'group_members',
    ];

    protected $casts = [
        'addons' => 'array',
        'stock_held' => 'boolean',
        'items' => 'array',
        'quantity' => 'integer',
        'is_group' => 'boolean',
        'stage' => 'integer',
        'days' => 'integer',
        'deposit' => 'integer',
        'total' => 'integer',
        'dp' => 'integer',
        'trust_score' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function costume(): BelongsTo
    {
        return $this->belongsTo(Costume::class);
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    /** Item pesanan; pesanan lama (tanpa items) dianggap 1 unit. */
    public function lineItems(): array
    {
        $items = $this->items;
        if (is_array($items) && $items) {
            return $items;
        }

        return [['size' => (string) $this->size, 'qty' => 1]];
    }

    /** Ringkasan untuk kolom `size`, mis. "M×2, L×1". */
    public static function summarizeItems(array $items): string
    {
        return implode(', ', array_map(fn ($i) => $i['size'].'×'.$i['qty'], $items));
    }

    public static function bucketForStage(int $stage): string
    {
        return match (true) {
            $stage >= 7 => 'Selesai',
            $stage >= 5 => 'Disewa',
            $stage >= 2 => 'Diproses',
            default => 'Menunggu verifikasi',
        };
    }

    /** Kembalikan stok semua unit pesanan ini, per ukuran (sekali saja per pesanan). */
    public function releaseStock(): void
    {
        if ($this->stock_held && $this->costume_id) {
            $costume = Costume::lockForUpdate()->find($this->costume_id);
            if ($costume) {
                foreach ($this->lineItems() as $item) {
                    $costume->adjustStock($item['size'], (int) $item['qty']);
                }
                $costume->save();
            }
        }
        $this->stock_held = false;
    }

    private function reviewFront(): ?array
    {
        $review = $this->review;
        if (!$review) {
            return null;
        }
        $review->setRelation('order', $this); // hindari query berulang

        return $review->toFront();
    }

    /** Bentuk data yang dipakai frontend (id = kode pesanan). Foto hanya untuk admin. */
    public function toFront(bool $withDocs = false): array
    {
        $data = [
            'id' => $this->order_code,
            'productId' => $this->costume_id,
            'productName' => $this->costume_name,
            'productImage' => $this->costume_image,
            'customerName' => $this->customer_name,
            'customerEmail' => $this->customer_email,
            'phone' => $this->phone,
            'address' => $this->address,
            'socialPlatform' => $this->social_platform,
            'socialHandle' => $this->social_handle,
            'guarantor' => $this->guarantor_phone,
            'size' => $this->size,
            'items' => $this->lineItems(),
            'quantity' => (int) ($this->quantity ?: 1),
            'isGroup' => (bool) $this->is_group,
            'groupName' => $this->group_name,
            'groupMembers' => $this->group_members,
            'idStatus' => $this->user?->id_status ?? 'none',
            'userId' => $this->user_id,
            'review' => $this->reviewFront(),
            'days' => $this->days,
            'addons' => $this->addons ?? [],
            'rentalDate' => $this->rental_date instanceof \DateTimeInterface
                ? $this->rental_date->format('Y-m-d')
                : (string) $this->rental_date,
            'deposit' => $this->deposit,
            'total' => $this->total,
            'dp' => $this->dp,
            'stage' => $this->stage,
            'bucket' => $this->bucket,
            'trackingNumber' => $this->tracking_number,
            'paymentMethod' => $this->payment_method,
            'trustScore' => $this->trust_score,
            'idSelfieName' => $this->id_selfie_name,
            'paymentProofName' => $this->payment_proof_name,
            'hasIdSelfie' => !empty($this->id_selfie_name) || !empty($this->id_selfie_image),
            'hasPaymentProof' => !empty($this->payment_proof_image),
            'createdAt' => optional($this->created_at)->translatedFormat('j F Y, H:i'),
            'createdAtIso' => optional($this->created_at)->toIso8601String(),
        ];

        if ($withDocs) {
            $data['idSelfieImage'] = $this->id_selfie_image;
            $data['paymentProofImage'] = $this->payment_proof_image;
        }

        return $data;
    }
}
