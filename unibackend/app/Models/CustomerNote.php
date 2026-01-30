<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'author_id',
        'note',
        'is_visible_to_customer',
    ];

    protected $casts = [
        'is_visible_to_customer' => 'boolean',
    ];

    /**
     * The customer who owns the note.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The staff member who created the note.
     */
    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
