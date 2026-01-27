<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromoCodeProduct extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'promo_code_id',
        'product_id',
    ];
}
