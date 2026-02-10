<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'date_of_birth',
        'gender',
        'password',
        'avatar',
        'language',
        'role',
        'is_active',
        'is_verified',
        'email_verified_at',
        'phone_verified_at',
        'google_id',
        'apple_id',
        'is_social_only',
        'two_factor_enabled',
        'is_cod_restricted',
        'max_order_value',
        'registration_source',
        'loyalty_points',
        'is_vip',
        // Driver fields
        'current_lat',
        'current_lng',
        'location_updated_at',
        'is_available',
        'assigned_zone_id',
        'vehicle_type',
        'vehicle_plate',
        'total_deliveries',
        'average_rating',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
            'date_of_birth' => 'date:Y-m-d',
            'is_active' => 'boolean',
            'is_verified' => 'boolean',
            'is_social_only' => 'boolean',
            'two_factor_enabled' => 'boolean',
            'push_tokens' => 'array',
            'is_cod_restricted' => 'boolean',
            'max_order_value' => 'decimal:2',
            'is_vip' => 'boolean',
            'current_lat' => 'decimal:8',
            'current_lng' => 'decimal:8',
            'location_updated_at' => 'datetime',
            'is_available' => 'boolean',
            'total_deliveries' => 'integer',
            'average_rating' => 'decimal:2',
        ];
    }

    /**
     * Get the notes for this customer.
     */
    public function notes()
    {
        return $this->hasMany(CustomerNote::class, 'user_id');
    }

    /**
     * Get the notes authored by this user (staff).
     */
    public function authoredNotes()
    {
        return $this->hasMany(CustomerNote::class, 'author_id');
    }

    /**
     * Get the user's full name.
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    /**
     * Check if user is admin.
     */
    public function isAdmin(): bool
    {
        return in_array($this->role, ['super_admin', 'admin', 'sales_manager', 'accountant', 'customer_support']);
    }

    /**
     * Check if user is customer.
     */
    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    /**
     * Check if user is a delivery driver.
     */
    public function isDriver(): bool
    {
        return $this->role === 'driver';
    }

    /**
     * Get the user's assigned delivery zone (driver only).
     */
    public function assignedZone()
    {
        return $this->belongsTo(DeliveryZone::class, 'assigned_zone_id');
    }

    /**
     * Get the user's addresses.
     */
    public function addresses()
    {
        return $this->hasMany(Address::class);
    }

    /**
     * Get the user's default address.
     */
    public function defaultAddress()
    {
        return $this->hasOne(Address::class)->where('is_default', true);
    }

    /**
     * Get the user's favorites.
     */
    public function favorites()
    {
        return $this->hasMany(Favorite::class);
    }

    /**
     * Get the user's complaints.
     */
    public function complaints()
    {
        return $this->hasMany(Complaint::class);
    }

    /**
     * Get the user's complaint messages.
     */
    public function complaintMessages()
    {
        return $this->hasMany(ComplaintMessage::class);
    }

    /**
     * Get the user's orders.
     */
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Get the user's notification preferences.
     */
    public function notificationPreferences()
    {
        return $this->hasOne(NotificationPreference::class);
    }

    /**
     * Get the user's notifications.
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get the user's wallet.
     */
    public function wallet()
    {
        return $this->hasOne(UserWallet::class);
    }
}
