<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromoCodeCategory extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'promo_code_id',
        'category_id',
        'include_subcategories',
    ];
}
