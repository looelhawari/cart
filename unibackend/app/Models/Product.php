<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Product extends Model
{
    protected $primaryKey = 'barcode';
    public $incrementing = false;
    protected $keyType = 'int';

    /**
     * Attributes hidden from JSON serialization (security: never expose margins)
     */
    protected $hidden = [
        'cost_price',
    ];

    /**
     * Normalise product image URL to an absolute URL.
     *
     * Defence (Wave 5 — Task 5): legacy rows hold values like
     *   "/storage/products/abc.jpg"   (relative, served by storage:link)
     *   "products/abc.jpg"             (Cloudinary-style relative path)
     *   "http://localhost:8000/..."   (env-specific, breaks when admin
     *                                  dashboard is hosted on a different
     *                                  origin)
     *   "https://res.cloudinary.com/.../abc.jpg"  (already absolute — keep)
     *
     * Returning an absolute URL keyed off `config('app.url')` lets the
     * admin dashboard render the <img> regardless of where it's hosted.
     * Cloudinary / S3 / any https:// URL is returned unchanged.
     */
    public function getImageAttribute($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        // Already absolute (Cloudinary, S3, full URL) — keep.
        if (preg_match('#^https?://#i', $value) === 1) {
            return $value;
        }
        // Relative path — anchor to the app URL.
        $base = rtrim((string) config('app.url'), '/');
        $path = '/' . ltrim($value, '/');
        return $base . $path;
    }

    protected $fillable = [
        'barcode',
        'name_en',
        'name_ar',
        'slug',
        'image',
        'description_en',
        'description_ar',
        'packaging',
        'price',
        'sale_price',
        'cost_price',
        'stock_quantity',
        'is_in_stock',
        'weight',
        'unit',
        'nutrition_facts',
        'rating',
        'review_count',
        'is_featured',
        'is_active',
        'sales_count',
    ];

    protected $casts = [
        'barcode' => 'integer',
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'weight' => 'decimal:2',
        'stock_quantity' => 'integer',
        'is_in_stock' => 'boolean',
        'rating' => 'decimal:2',
        'review_count' => 'integer',
        'nutrition_facts' => 'array',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'sales_count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The categories that belong to the product
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'product_categories', 'product_id', 'category_id', 'barcode');
    }

    /**
     * Get discount percentage if sale_price exists
     */
    public function getDiscountPercentageAttribute(): ?int
    {
        if ($this->sale_price && $this->price > $this->sale_price) {
            return round((($this->price - $this->sale_price) / $this->price) * 100);
        }
        return null;
    }

    /**
     * Get the effective price (sale price or regular price)
     */
    public function getEffectivePriceAttribute(): float
    {
        return $this->sale_price ?? $this->price;
    }

    /**
     * Canonical "on sale" definition.
     *
     * Why: Different parts of the codebase historically used inconsistent
     * predicates ("on_sale" boolean column that does NOT exist in the schema,
     * vs. whereNotNull('sale_price'), vs. sale_price < price). This scope is
     * the single source of truth — the same one the public products endpoint
     * uses to expose discounted items to the mobile app. All admin metrics
     * (products on sale, total discount given, etc.) MUST use it so app and
     * dashboard cannot diverge.
     */
    public function scopeOnSale($query)
    {
        return $query
            ->whereNotNull('sale_price')
            ->whereColumn('sale_price', '<', 'price');
    }
}
