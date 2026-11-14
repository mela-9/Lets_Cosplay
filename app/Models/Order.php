<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
    ];

    protected $casts = [
        'addons' => 'array',
        'stock_held' => 'boolean',
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

    public static function bucketForStage(int $stage): string
    {
        return match (true) {
            $stage >= 7 => 'Selesai',
            $stage >= 5 => 'Disewa',
            $stage >= 2 => 'Diproses',
            default => 'Menunggu verifikasi',
        };
    }

    /** Kembalikan 1 unit stok kostum (sekali saja per pesanan). */
    public function releaseStock(): void
    {
        if ($this->stock_held && $this->costume_id) {
            Costume::where('id', $this->costume_id)->increment('stock');
        }
        $this->stock_held = false;
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
        ];

        if ($withDocs) {
            $data['idSelfieImage'] = $this->id_selfie_image;
            $data['paymentProofImage'] = $this->payment_proof_image;
        }

        return $data;
    }
}
