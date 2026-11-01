<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model {
    use HasFactory;

    protected $fillable = [
        'title',
        'date',
        'location',
        'category',
        'media_url',
        'description',
        'signature',
        'recommended_costumes'
    ];

    protected $casts = [
        'recommended_costumes' => 'array'
    ];
}