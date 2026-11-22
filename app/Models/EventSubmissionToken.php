<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventSubmissionToken extends Model
{
    protected $fillable = ['token_hash', 'tier', 'event_id', 'consumed_at'];

    protected $casts = ['consumed_at' => 'datetime'];
}
