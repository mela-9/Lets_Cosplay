<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'date', 'location', 'theme', 'category', 'tier', 'status',
        'image', 'description', 'featured',
        'payment_proof_name', 'payment_proof_image', 'terms_accepted',
    ];

    protected $casts = [
        'featured' => 'boolean',
        'terms_accepted' => 'boolean',
    ];

    /** Bentuk data yang dipakai frontend. Bukti bayar hanya untuk admin. */
    public function toFront(bool $withProof = false): array
    {
        $data = [
            'id' => (string) $this->id,
            'title' => $this->title,
            'date' => $this->date,
            'location' => $this->location,
            'theme' => $this->theme,
            'category' => $this->category,
            'tier' => $this->tier,
            'status' => $this->status,
            'image' => $this->image,
            'description' => $this->description,
            'featured' => $this->featured,
        ];

        if ($withProof) {
            $data['paymentProofName'] = $this->payment_proof_name;
            $data['paymentProofImage'] = $this->payment_proof_image;
        }

        return $data;
    }
}
