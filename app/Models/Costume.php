<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Costume extends Model
{
    protected $fillable = [
        'name', 'series', 'origin', 'category', 'size',
        'price', 'deposit', 'stock', 'rating', 'reviews',
        'tag', 'image', 'description', 'accessories', 'themes'
    ];

    protected $casts = [
        'size' => 'array',
        'accessories' => 'array',
        'themes' => 'array',
        'price' => 'float',
        'deposit' => 'float',
    ];
}