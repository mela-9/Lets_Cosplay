<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Costume extends Model
{
    protected $fillable = [
        'name', 'series', 'origin', 'category', 'size',
        'price', 'deposit', 'stock', 'rating', 'reviews',
        'tag', 'image', 'description', 'accessories', 'themes',
    ];

    protected $casts = [
        'size' => 'array',
        'accessories' => 'array',
        'themes' => 'array',
        'price' => 'float',
        'deposit' => 'float',
        'rating' => 'float',
        'stock' => 'integer',
        'reviews' => 'integer',
    ];

    /** Kata kunci tema untuk pencocokan event ↔ kostum (smart pairing). */
    public static function buildThemes(string ...$parts): array
    {
        $words = preg_split('/[^a-z0-9]+/', mb_strtolower(implode(' ', $parts)), -1, PREG_SPLIT_NO_EMPTY);

        return array_values(array_unique(array_filter($words, fn ($w) => strlen($w) > 2)));
    }
}
