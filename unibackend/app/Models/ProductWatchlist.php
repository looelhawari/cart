<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductWatchlist extends Model
{
    protected $table = 'product_watchlist';

    protected $fillable = [
        'user_id',
        'product_id',
        'notify_back_in_stock',
        'notify_price_drop',
        'price_threshold',
        'last_known_price',
        'notified_back_in_stock',
        'notified_price_drop',
        'last_notified_at',
    ];

    protected $casts = [
        'notify_back_in_stock' => 'boolean',
        'notify_price_drop' => 'boolean',
        'price_threshold' => 'decimal:2',
        'last_known_price' => 'decimal:2',
        'notified_back_in_stock' => 'boolean',
        'notified_price_drop' => 'boolean',
        'last_notified_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        // Explicit keys: Product's primary key is `barcode` (not `id`), so the
        // default belongsTo would look for a non-existent `product_barcode`
        // foreign column. The real foreign key is `product_id` referencing
        // products.barcode.
        return $this->belongsTo(Product::class, 'product_id', 'barcode');
    }

    /**
     * Add product to watchlist.
     */
    public static function addToWatchlist(
        int $userId,
        int $productId,
        bool $notifyBackInStock = true,
        bool $notifyPriceDrop = false,
        ?float $priceThreshold = null
    ): self {
        $product = Product::find($productId);

        return self::updateOrCreate(
            ['user_id' => $userId, 'product_id' => $productId],
            [
                'notify_back_in_stock' => $notifyBackInStock,
                'notify_price_drop' => $notifyPriceDrop,
                'price_threshold' => $priceThreshold,
                'last_known_price' => $product?->price,
                'notified_back_in_stock' => false,
                'notified_price_drop' => false,
            ]
        );
    }

    /**
     * Reset notification flags when product goes out of stock.
     */
    public function resetBackInStockFlag(): void
    {
        $this->update(['notified_back_in_stock' => false]);
    }

    /**
     * Reset price drop flag when price increases.
     */
    public function resetPriceDropFlag(): void
    {
        $this->update(['notified_price_drop' => false]);
    }
}
