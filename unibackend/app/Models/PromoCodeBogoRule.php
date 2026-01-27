<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromoCodeBogoRule extends Model
{
    protected $fillable = [
        'promo_code_id',
        'buy_scope',
        'buy_product_id',
        'buy_category_id',
        'buy_include_subcategories',
        'buy_qty',
        'get_scope',
        'get_product_id',
        'get_category_id',
        'get_include_subcategories',
        'get_qty',
        'get_discount_type',
        'get_discount_value',
        'max_applications_per_order',
        'is_active',
    ];

    protected $casts = [
        'buy_include_subcategories' => 'boolean',
        'get_include_subcategories' => 'boolean',
        'get_discount_value' => 'decimal:2',
        'is_active' => 'boolean',
    ];
}
