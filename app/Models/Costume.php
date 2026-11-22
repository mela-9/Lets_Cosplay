<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Costume extends Model
{
    protected $fillable = [
        'name', 'series', 'origin', 'category', 'size', 'size_stock',
        'price', 'deposit', 'stock', 'rating', 'reviews',
        'tag', 'image', 'images', 'description', 'accessories', 'themes',
    ];

    protected $casts = [
        'size' => 'array',
        'size_stock' => 'array',
        'images' => 'array',
        'accessories' => 'array',
        'themes' => 'array',
        'price' => 'float',
        'deposit' => 'float',
        'rating' => 'float',
        'stock' => 'integer',
        'reviews' => 'integer',
    ];

    protected static function booted(): void
    {
        // Jaga konsistensi: daftar ukuran & stok total selalu mengikuti stok per ukuran,
        // dan foto sampul selalu foto pertama galeri.
        static::saving(function (Costume $c) {
            $map = $c->size_stock;
            if (!is_array($map) || !$map) {
                $sizes = $c->size ?: [];
                if ($sizes) {
                    $map = self::distribute($sizes, (int) $c->stock);
                }
            }
            if (is_array($map) && $map) {
                $map = array_map(fn ($v) => max(0, (int) $v), $map);
                $c->size_stock = $map;
                $c->size = array_keys($map);
                $c->stock = array_sum($map);
            }

            $images = array_values(array_filter((array) $c->images, fn ($i) => is_string($i) && $i !== ''));
            if (!$images && $c->image) {
                $images = [$c->image];
            }
            if ($images) {
                $c->images = $images;
                $c->image = $images[0];
            }
        });
    }

    public function reviewsList(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /** Bagi total stok ke ukuran-ukuran yang ada (total tetap). */
    public static function distribute(array $sizes, int $total): array
    {
        $sizes = array_values($sizes);
        $base = intdiv($total, max(1, count($sizes)));
        $extra = $total % max(1, count($sizes));
        $map = [];
        foreach ($sizes as $i => $size) {
            $map[$size] = $base + ($i < $extra ? 1 : 0);
        }

        return $map;
    }

    public function stockFor(string $size): int
    {
        return (int) (($this->size_stock ?? [])[$size] ?? 0);
    }

    /** Tambah/kurangi stok satu ukuran (belum disimpan). */
    public function adjustStock(string $size, int $delta): void
    {
        $map = $this->size_stock ?? [];
        if (!array_key_exists($size, $map)) {
            return;
        }
        $map[$size] = max(0, (int) $map[$size] + $delta);
        $this->size_stock = $map;
    }

    /** Hitung ulang rating & jumlah ulasan dari ulasan nyata. */
    public function refreshRating(): void
    {
        $agg = $this->reviewsList()->selectRaw('COUNT(*) as c, AVG(rating) as a')->first();
        $this->reviews = (int) ($agg->c ?? 0);
        $this->rating = $this->reviews ? round((float) $agg->a, 2) : 5.0;
        $this->save();
    }

    /** Kata kunci tema untuk pencocokan event ↔ kostum (smart pairing). */
    public static function buildThemes(string ...$parts): array
    {
        $words = preg_split('/[^a-z0-9]+/', mb_strtolower(implode(' ', $parts)), -1, PREG_SPLIT_NO_EMPTY);

        return array_values(array_unique(array_filter($words, fn ($w) => strlen($w) > 2)));
    }
}
