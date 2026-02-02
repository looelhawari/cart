<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

/**
 * Inventory Locking Service
 * 
 * CRITICAL for preventing:
 * - Overselling
 * - Deadlocks
 * - Race conditions
 * 
 * Uses two strategies:
 * 1. Redis-based atomic operations (preferred, faster)
 * 2. MySQL SELECT FOR UPDATE (fallback)
 */
class InventoryService
{
    /**
     * Redis key prefix for stock locks
     */
    protected const LOCK_PREFIX = 'stock:lock:';

    /**
     * Redis key prefix for stock counts
     */
    protected const STOCK_PREFIX = 'stock:count:';

    /**
     * Lock timeout in seconds
     */
    protected const LOCK_TIMEOUT = 30;

    /**
     * Check if Redis is available for stock operations
     */
    protected function isRedisAvailable(): bool
    {
        try {
            Redis::ping();
            return true;
        } catch (\Exception $e) {
            Log::warning('InventoryService: Redis unavailable, using DB fallback');
            return false;
        }
    }

    /**
     * Reserve stock for multiple products atomically.
     * 
     * @param array $items Array of ['product_id' => quantity]
     * @return bool True if all items reserved successfully
     * @throws \Exception If insufficient stock or locking fails
     */
    public function reserveStock(array $items): bool
    {
        if ($this->isRedisAvailable()) {
            return $this->reserveStockRedis($items);
        }
        return $this->reserveStockDatabase($items);
    }

    /**
     * Release reserved stock (for failed orders or cancellations).
     * 
     * @param array $items Array of ['product_id' => quantity]
     */
    public function releaseStock(array $items): void
    {
        if ($this->isRedisAvailable()) {
            $this->releaseStockRedis($items);
        } else {
            $this->releaseStockDatabase($items);
        }
    }

    /**
     * Reserve stock using Redis atomic operations.
     */
    protected function reserveStockRedis(array $items): bool
    {
        $reserved = [];

        try {
            foreach ($items as $productId => $quantity) {
                // Try to acquire lock
                $lockKey = self::LOCK_PREFIX . $productId;
                $lockAcquired = Redis::set($lockKey, '1', 'NX', 'EX', self::LOCK_TIMEOUT);

                if (!$lockAcquired) {
                    // Lock held by another process, wait briefly and retry
                    usleep(50000); // 50ms
                    $lockAcquired = Redis::set($lockKey, '1', 'NX', 'EX', self::LOCK_TIMEOUT);

                    if (!$lockAcquired) {
                        throw new \Exception("Product {$productId} is currently being processed. Please try again.", 409);
                    }
                }

                // Get current stock from Redis or DB
                $stockKey = self::STOCK_PREFIX . $productId;
                $currentStock = Redis::get($stockKey);

                if ($currentStock === null) {
                    // Load from database and cache
                    $product = Product::where('barcode', $productId)->first();
                    if (!$product) {
                        Redis::del($lockKey);
                        throw new \Exception("Product {$productId} not found.", 404);
                    }
                    $currentStock = $product->stock_quantity;
                    Redis::set($stockKey, $currentStock);
                }

                // Check if enough stock
                if ((int)$currentStock < $quantity) {
                    Redis::del($lockKey);
                    throw new \Exception("Insufficient stock for product {$productId}. Available: {$currentStock}", 422);
                }

                // Decrement atomically
                $newStock = Redis::decrby($stockKey, $quantity);

                if ($newStock < 0) {
                    // Race condition occurred, rollback
                    Redis::incrby($stockKey, $quantity);
                    Redis::del($lockKey);
                    throw new \Exception("Insufficient stock for product {$productId}.", 422);
                }

                $reserved[$productId] = $quantity;

                // Release lock
                Redis::del($lockKey);
            }

            // Sync to database in background (eventual consistency)
            $this->syncStockToDatabase($reserved);

            return true;
        } catch (\Exception $e) {
            // Rollback any reserved items
            foreach ($reserved as $productId => $quantity) {
                $stockKey = self::STOCK_PREFIX . $productId;
                Redis::incrby($stockKey, $quantity);
            }
            throw $e;
        }
    }

    /**
     * Reserve stock using database with SELECT FOR UPDATE.
     */
    protected function reserveStockDatabase(array $items): bool
    {
        return DB::transaction(function () use ($items) {
            $productIds = array_keys($items);

            // Lock rows for update - ORDER BY prevents deadlocks
            $products = Product::whereIn('barcode', $productIds)
                ->orderBy('barcode')
                ->lockForUpdate()
                ->get()
                ->keyBy('barcode');

            foreach ($items as $productId => $quantity) {
                $product = $products->get($productId);

                if (!$product) {
                    throw new \Exception("Product {$productId} not found.", 404);
                }

                if (!$product->is_active) {
                    throw new \Exception("Product {$productId} is not available.", 422);
                }

                if (!$product->is_in_stock || $product->stock_quantity < $quantity) {
                    throw new \Exception(
                        "Insufficient stock for product {$productId}. Available: {$product->stock_quantity}",
                        422
                    );
                }
            }

            // All validations passed, now decrement stock
            foreach ($items as $productId => $quantity) {
                $product = $products->get($productId);
                $product->decrement('stock_quantity', $quantity);
                $product->increment('sales_count', $quantity);

                // Update is_in_stock if needed
                if ($product->stock_quantity - $quantity <= 0) {
                    $product->update(['is_in_stock' => false]);
                }
            }

            Log::info('InventoryService: Stock reserved via DB', [
                'items' => $items,
            ]);

            return true;
        });
    }

    /**
     * Release stock using Redis.
     */
    protected function releaseStockRedis(array $items): void
    {
        foreach ($items as $productId => $quantity) {
            $stockKey = self::STOCK_PREFIX . $productId;
            Redis::incrby($stockKey, $quantity);
        }

        // Sync to database
        $this->syncStockToDatabase($items, 'release');
    }

    /**
     * Release stock using database.
     */
    protected function releaseStockDatabase(array $items): void
    {
        DB::transaction(function () use ($items) {
            foreach ($items as $productId => $quantity) {
                Product::where('barcode', $productId)->increment('stock_quantity', $quantity);
                Product::where('barcode', $productId)->decrement('sales_count', $quantity);
                Product::where('barcode', $productId)->update(['is_in_stock' => true]);
            }
        });

        Log::info('InventoryService: Stock released via DB', [
            'items' => $items,
        ]);
    }

    /**
     * Sync stock changes from Redis to database.
     */
    protected function syncStockToDatabase(array $items, string $operation = 'reserve'): void
    {
        // Queue a job to sync stock to database
        // This provides eventual consistency while keeping Redis fast
        dispatch(function () use ($items, $operation) {
            DB::transaction(function () use ($items, $operation) {
                foreach ($items as $productId => $quantity) {
                    if ($operation === 'reserve') {
                        Product::where('barcode', $productId)->decrement('stock_quantity', $quantity);
                        Product::where('barcode', $productId)->increment('sales_count', $quantity);
                    } else {
                        Product::where('barcode', $productId)->increment('stock_quantity', $quantity);
                        Product::where('barcode', $productId)->decrement('sales_count', $quantity);
                    }
                }
            });
        })->afterResponse();
    }

    /**
     * Check stock availability without locking.
     * 
     * @param array $items Array of ['product_id' => quantity]
     * @return array ['available' => bool, 'insufficient' => [...product_ids...]]
     */
    public function checkAvailability(array $items): array
    {
        $insufficient = [];

        if ($this->isRedisAvailable()) {
            foreach ($items as $productId => $quantity) {
                $stockKey = self::STOCK_PREFIX . $productId;
                $currentStock = Redis::get($stockKey);

                if ($currentStock === null) {
                    $product = Product::where('barcode', $productId)->first();
                    $currentStock = $product ? $product->stock_quantity : 0;
                }

                if ((int)$currentStock < $quantity) {
                    $insufficient[$productId] = [
                        'requested' => $quantity,
                        'available' => (int)$currentStock,
                    ];
                }
            }
        } else {
            $products = Product::whereIn('barcode', array_keys($items))
                ->get()
                ->keyBy('barcode');

            foreach ($items as $productId => $quantity) {
                $product = $products->get($productId);
                $available = $product ? $product->stock_quantity : 0;

                if ($available < $quantity) {
                    $insufficient[$productId] = [
                        'requested' => $quantity,
                        'available' => $available,
                    ];
                }
            }
        }

        return [
            'available' => empty($insufficient),
            'insufficient' => $insufficient,
        ];
    }

    /**
     * Sync Redis stock cache from database (run periodically or on startup).
     */
    public function syncCacheFromDatabase(): void
    {
        if (!$this->isRedisAvailable()) {
            return;
        }

        $products = Product::select('barcode', 'stock_quantity')
            ->where('is_active', true)
            ->cursor();

        foreach ($products as $product) {
            $stockKey = self::STOCK_PREFIX . $product->barcode;
            Redis::set($stockKey, $product->stock_quantity);
        }

        Log::info('InventoryService: Stock cache synced from database');
    }

    /**
     * Clear stock cache for a specific product.
     */
    public function clearCache(?int $productId = null): void
    {
        if (!$this->isRedisAvailable()) {
            return;
        }

        if ($productId) {
            Redis::del(self::STOCK_PREFIX . $productId);
        } else {
            // Clear all stock cache keys
            $keys = Redis::keys(self::STOCK_PREFIX . '*');
            if (!empty($keys)) {
                Redis::del(...$keys);
            }
        }
    }
}
