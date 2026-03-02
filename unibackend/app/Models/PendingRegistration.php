<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PendingRegistration extends Model
{
    protected $fillable = [
        'registration_token',
        'first_name',
        'last_name',
        'email',
        'phone',
        'password_hash',
        'language',
        'status',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    /**
     * Check if this pending registration has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if password has been set (step 2 completed).
     */
    public function hasPassword(): bool
    {
        return !is_null($this->password_hash);
    }
}
