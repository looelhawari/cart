<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Review extends Model
{
    protected $fillable = [
        'rating_type',
        'order_id',
        'user_id',
        'product_id',
        'rating',
        'comment',
        'images',
        'status',
        'is_approved',
        'response',
        'responded_at',
        'responded_by',
    ];

    protected $casts = [
        'rating' => 'integer',
        'is_approved' => 'boolean',
        'images' => 'array',
        'responded_at' => 'datetime',
    ];

    /**
     * The user who wrote the review.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The reviewed product.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id', 'barcode');
    }

    /**
     * The order associated with the review.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Scope for approved reviews.
     */
    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    /**
     * Scope for pending reviews.
     */
    public function scopePending($query)
    {
        return $query->where('is_approved', false);
    }

    /**
     * The admin who responded to this review.
     */
    public function respondedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    /**
     * The logs for this review.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(RatingLog::class);
    }

    /**
     * Scope for product reviews.
     */
    public function scopeProductReviews($query)
    {
        return $query->where('rating_type', 'product');
    }

    /**
     * Scope for order reviews.
     */
    public function scopeOrderReviews($query)
    {
        return $query->where('rating_type', 'order');
    }

    /**
     * Scope for store reviews.
     */
    public function scopeStoreReviews($query)
    {
        return $query->where('rating_type', 'store');
    }
}
