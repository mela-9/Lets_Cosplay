<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $fillable = ['order_id', 'user_id', 'costume_id', 'rating', 'comment', 'reply', 'replied_at'];

    protected $casts = ['rating' => 'integer', 'replied_at' => 'datetime'];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function costume(): BelongsTo
    {
        return $this->belongsTo(Costume::class);
    }

    /** Nama pembeli disingkat (Barbara P.) untuk tampilan publik. */
    public function publicName(): string
    {
        $parts = preg_split('/\s+/', trim((string) ($this->order?->customer_name ?? $this->user?->name ?? 'Penyewa')));
        $first = $parts[0] ?? 'Penyewa';

        return count($parts) > 1 ? $first.' '.mb_substr($parts[1], 0, 1).'.' : $first;
    }

    public function toFront(bool $admin = false): array
    {
        $data = [
            'id' => $this->id,
            'orderId' => $this->order?->order_code,
            'costumeId' => $this->costume_id,
            'costumeName' => $this->order?->costume_name,
            'costumeImage' => $this->order?->costume_image,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'reply' => $this->reply,
            'repliedAt' => optional($this->replied_at)->translatedFormat('j F Y'),
            'size' => $this->order?->size,
            'customerName' => $this->publicName(),
            'createdAt' => optional($this->created_at)->translatedFormat('j F Y'),
        ];
        if ($admin) {
            $data['customerFullName'] = $this->order?->customer_name;
        }

        return $data;
    }
}
