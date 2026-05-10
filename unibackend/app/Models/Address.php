<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Address extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'label',
        'recipient_name',
        'phone',
        'street',
        'building',
        'floor',
        'apartment',
        'city',
        'area',
        'postal_code',
        'landmark',
        'latitude',
        'longitude',
        'delivery_zone_id',
        'formatted_address',
        'place_id',
        'notes',
        'is_default',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_default' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that owns the address.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the delivery zone for this address.
     */
    public function deliveryZone()
    {
        return $this->belongsTo(DeliveryZone::class, 'delivery_zone_id');
    }

    /**
     * Check if address has GPS coordinates.
     */
    public function hasCoordinates(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }

    /**
     * Scope a query to only include default addresses.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Set this address as default and unset all others for the user.
     *
     * CONCURRENCY HARDENED (audit H6): two concurrent setAsDefault calls
     * could both update without coordination, leaving the user with two
     * defaults during the gap. Wrapped in a transaction with row locks
     * scoped per-user so the unset-then-set runs atomically.
     */
    public function setAsDefault()
    {
        \DB::transaction(function () {
            // Lock all of this user's address rows so concurrent setAsDefault
            // calls serialize.
            static::where('user_id', $this->user_id)
                ->lockForUpdate()
                ->get();

            static::where('user_id', $this->user_id)
                ->where('id', '!=', $this->id)
                ->update(['is_default' => false]);

            $this->forceFill(['is_default' => true])->save();
        });
    }
}
