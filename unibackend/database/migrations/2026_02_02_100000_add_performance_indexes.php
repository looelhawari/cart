<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * CRITICAL PERFORMANCE MIGRATION
 * 
 * This migration adds indexes that can make queries 10-100x faster.
 * On a single server setup, proper indexing is NON-NEGOTIABLE.
 * 
 * These indexes target the most common query patterns:
 * - Order lookups by user, status, and date
 * - Product filtering by category
 * - User lookups by phone
 * - Cart operations by session and user
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Orders table indexes
        Schema::table('orders', function (Blueprint $table) {
            // Check if index exists before adding
            if (!$this->indexExists('orders', 'orders_user_id_index')) {
                $table->index('user_id', 'orders_user_id_index');
            }
            if (!$this->indexExists('orders', 'orders_status_index')) {
                $table->index('status', 'orders_status_index');
            }
            if (!$this->indexExists('orders', 'orders_created_at_index')) {
                $table->index('created_at', 'orders_created_at_index');
            }
            if (!$this->indexExists('orders', 'orders_payment_status_index')) {
                $table->index('payment_status', 'orders_payment_status_index');
            }
            // Composite index for common admin queries
            if (!$this->indexExists('orders', 'orders_user_status_created_index')) {
                $table->index(['user_id', 'status', 'created_at'], 'orders_user_status_created_index');
            }
        });

        // Order items table indexes
        Schema::table('order_items', function (Blueprint $table) {
            if (!$this->indexExists('order_items', 'order_items_order_id_index')) {
                $table->index('order_id', 'order_items_order_id_index');
            }
            if (!$this->indexExists('order_items', 'order_items_product_id_index')) {
                $table->index('product_id', 'order_items_product_id_index');
            }
        });

        // Products table indexes
        Schema::table('products', function (Blueprint $table) {
            if (!$this->indexExists('products', 'products_is_active_index')) {
                $table->index('is_active', 'products_is_active_index');
            }
            if (!$this->indexExists('products', 'products_is_featured_index')) {
                $table->index('is_featured', 'products_is_featured_index');
            }
            if (!$this->indexExists('products', 'products_is_in_stock_index')) {
                $table->index('is_in_stock', 'products_is_in_stock_index');
            }
            if (!$this->indexExists('products', 'products_sales_count_index')) {
                $table->index('sales_count', 'products_sales_count_index');
            }
            // Composite index for product listing queries
            if (!$this->indexExists('products', 'products_active_stock_index')) {
                $table->index(['is_active', 'is_in_stock'], 'products_active_stock_index');
            }
        });

        // Users table indexes
        Schema::table('users', function (Blueprint $table) {
            if (!$this->indexExists('users', 'users_phone_index')) {
                $table->index('phone', 'users_phone_index');
            }
            if (!$this->indexExists('users', 'users_created_at_index')) {
                $table->index('created_at', 'users_created_at_index');
            }
            if (!$this->indexExists('users', 'users_role_index')) {
                $table->index('role', 'users_role_index');
            }
            if (!$this->indexExists('users', 'users_is_active_index')) {
                $table->index('is_active', 'users_is_active_index');
            }
        });

        // Carts table indexes
        Schema::table('carts', function (Blueprint $table) {
            if (!$this->indexExists('carts', 'carts_user_id_index')) {
                $table->index('user_id', 'carts_user_id_index');
            }
            if (!$this->indexExists('carts', 'carts_session_id_index')) {
                $table->index('session_id', 'carts_session_id_index');
            }
        });

        // Cart items table indexes
        Schema::table('cart_items', function (Blueprint $table) {
            if (!$this->indexExists('cart_items', 'cart_items_cart_id_index')) {
                $table->index('cart_id', 'cart_items_cart_id_index');
            }
            if (!$this->indexExists('cart_items', 'cart_items_product_id_index')) {
                $table->index('product_id', 'cart_items_product_id_index');
            }
            // Composite index for cart item lookups
            if (!$this->indexExists('cart_items', 'cart_items_cart_product_index')) {
                $table->index(['cart_id', 'product_id'], 'cart_items_cart_product_index');
            }
        });

        // Product categories (pivot) table indexes
        if (Schema::hasTable('product_categories')) {
            Schema::table('product_categories', function (Blueprint $table) {
                if (!$this->indexExists('product_categories', 'product_categories_product_id_index')) {
                    $table->index('product_id', 'product_categories_product_id_index');
                }
                if (!$this->indexExists('product_categories', 'product_categories_category_id_index')) {
                    $table->index('category_id', 'product_categories_category_id_index');
                }
            });
        }

        // Promo code usage table indexes
        if (Schema::hasTable('promo_code_usage')) {
            Schema::table('promo_code_usage', function (Blueprint $table) {
                if (!$this->indexExists('promo_code_usage', 'promo_code_usage_user_id_index')) {
                    $table->index('user_id', 'promo_code_usage_user_id_index');
                }
                if (!$this->indexExists('promo_code_usage', 'promo_code_usage_promo_code_id_index')) {
                    $table->index('promo_code_id', 'promo_code_usage_promo_code_id_index');
                }
            });
        }

        // Notifications table indexes
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                if (!$this->indexExists('notifications', 'notifications_user_id_index')) {
                    $table->index('user_id', 'notifications_user_id_index');
                }
                if (!$this->indexExists('notifications', 'notifications_created_at_index')) {
                    $table->index('created_at', 'notifications_created_at_index');
                }
            });
        }

        // OTPs table indexes
        if (Schema::hasTable('otps')) {
            Schema::table('otps', function (Blueprint $table) {
                if (!$this->indexExists('otps', 'otps_identifier_type_index')) {
                    $table->index(['identifier', 'type'], 'otps_identifier_type_index');
                }
                if (!$this->indexExists('otps', 'otps_expires_at_index')) {
                    $table->index('expires_at', 'otps_expires_at_index');
                }
            });
        }

        // Favorites table indexes
        if (Schema::hasTable('favorites')) {
            Schema::table('favorites', function (Blueprint $table) {
                if (!$this->indexExists('favorites', 'favorites_user_id_index')) {
                    $table->index('user_id', 'favorites_user_id_index');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Orders table
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndexIfExists('orders_user_id_index');
            $table->dropIndexIfExists('orders_status_index');
            $table->dropIndexIfExists('orders_created_at_index');
            $table->dropIndexIfExists('orders_payment_status_index');
            $table->dropIndexIfExists('orders_user_status_created_index');
        });

        // Order items table
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndexIfExists('order_items_order_id_index');
            $table->dropIndexIfExists('order_items_product_id_index');
        });

        // Products table
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndexIfExists('products_is_active_index');
            $table->dropIndexIfExists('products_is_featured_index');
            $table->dropIndexIfExists('products_is_in_stock_index');
            $table->dropIndexIfExists('products_sales_count_index');
            $table->dropIndexIfExists('products_active_stock_index');
        });

        // Users table
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndexIfExists('users_phone_index');
            $table->dropIndexIfExists('users_created_at_index');
            $table->dropIndexIfExists('users_role_index');
            $table->dropIndexIfExists('users_is_active_index');
        });

        // Carts table
        Schema::table('carts', function (Blueprint $table) {
            $table->dropIndexIfExists('carts_user_id_index');
            $table->dropIndexIfExists('carts_session_id_index');
        });

        // Cart items table
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropIndexIfExists('cart_items_cart_id_index');
            $table->dropIndexIfExists('cart_items_product_id_index');
            $table->dropIndexIfExists('cart_items_cart_product_index');
        });

        // Product categories table
        if (Schema::hasTable('product_categories')) {
            Schema::table('product_categories', function (Blueprint $table) {
                $table->dropIndexIfExists('product_categories_product_id_index');
                $table->dropIndexIfExists('product_categories_category_id_index');
            });
        }

        // Promo code usage table
        if (Schema::hasTable('promo_code_usage')) {
            Schema::table('promo_code_usage', function (Blueprint $table) {
                $table->dropIndexIfExists('promo_code_usage_user_id_index');
                $table->dropIndexIfExists('promo_code_usage_promo_code_id_index');
            });
        }

        // Notifications table
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropIndexIfExists('notifications_user_id_index');
                $table->dropIndexIfExists('notifications_created_at_index');
            });
        }

        // OTPs table
        if (Schema::hasTable('otps')) {
            Schema::table('otps', function (Blueprint $table) {
                $table->dropIndexIfExists('otps_identifier_type_index');
                $table->dropIndexIfExists('otps_expires_at_index');
            });
        }

        // Favorites table
        if (Schema::hasTable('favorites')) {
            Schema::table('favorites', function (Blueprint $table) {
                $table->dropIndexIfExists('favorites_user_id_index');
            });
        }
    }

    /**
     * Check if an index exists on a table.
     */
    private function indexExists(string $table, string $indexName): bool
    {
        $indexes = DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$indexName]);
        return count($indexes) > 0;
    }
};
