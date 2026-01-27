<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_id',
        'name_en',
        'name_ar',
        'slug',
        'description_en',
        'description_ar',
        'image',
        'icon',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'parent_id' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Get the parent category
     */
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * Get the subcategories
     */
    public function subcategories()
    {
        return $this->hasMany(Category::class, 'parent_id')->where('is_active', true);
    }

    /**
     * Get all subcategories (including inactive)
     */
    public function allSubcategories()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /**
     * Get the children (alias for allSubcategories for admin dashboard)
     */
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /**
     * Get the products in this category
     */
    public function products()
    {
        return $this->belongsToMany(Product::class, 'product_categories', 'category_id', 'product_id');
    }

    /**
     * Scope: Only active categories
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Only main categories (no parent)
     */
    public function scopeMain($query)
    {
        return $query->whereNull('parent_id');
    }
}
