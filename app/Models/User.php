<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'role', 'password',
        'phone', 'address', 'social_platform', 'social_handle', 'guarantor_phone',
        'id_selfie_name', 'id_selfie', 'previous_rental', 'previous_store',
    ];

    protected $hidden = [
        'password', 'remember_token', 'api_token', 'id_selfie',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /** Buat token baru, simpan hash-nya, kembalikan token asli (hanya sekali ditampilkan). */
    public function issueToken(): string
    {
        $plain = Str::random(60);
        $this->forceFill(['api_token' => hash('sha256', $plain)])->save();

        return $plain;
    }

    public function revokeToken(): void
    {
        $this->forceFill(['api_token' => null])->save();
    }

    /** Skor kepercayaan: dipakai untuk keringanan deposit (>= 85 → deposit 50%). */
    public function trustScore(): int
    {
        if ($this->previous_rental === 'yes') {
            if (strlen(trim((string) $this->previous_store)) > 2) {
                $completed = $this->orders()->where('stage', '>=', 7)->count();
                return min(98, 88 + $completed * 2);
            }
            return 74;
        }

        return $this->previous_rental === 'no' ? 58 : 55;
    }

    /** Profil yang aman dikirim ke browser (tanpa foto identitas / token). */
    public function toProfile(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'phone' => $this->phone,
            'address' => $this->address,
            'socialPlatform' => $this->social_platform,
            'socialHandle' => $this->social_handle,
            'guarantor' => $this->guarantor_phone,
            'previousRental' => $this->previous_rental,
            'previousStore' => $this->previous_store,
            'hasIdSelfie' => !empty($this->id_selfie),
            'idSelfieName' => $this->id_selfie_name,
            'trustScore' => $this->trustScore(),
        ];
    }
}
