<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FlashSale;
use App\Models\FlashSaleProduct;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FlashSaleController extends Controller
{
    /**
     * Get all active flash sales.
     */
    public function index(): JsonResponse
    {
        $flashSales = FlashSale::getActive();

        $data = $flashSales->map(function ($sale) {
            return [
                'id' => $sale->id,
                'title' => $sale->title,
                'title_ar' => $sale->title_ar,
                'description' => $sale->description,
                'description_ar' => $sale->description_ar,
                'image_url' => $sale->image_url,
                'starts_at' => $sale->starts_at->toIso8601String(),
                'ends_at' => $sale->ends_at->toIso8601String(),
                'time_remaining_seconds' => $sale->time_remaining,
                'products_count' => $sale->products->count(),
                'max_discount' => $sale->products->max('discount_percent'),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get flash sale details with products.
     */
    public function show(int $id): JsonResponse
    {
        $sale = FlashSale::with(['products.product' => function ($query) {
            $query->select('id', 'name', 'name_ar', 'price', 'image_url', 'stock', 'barcode');
        }])->find($id);

        if (!$sale) {
            return response()->json([
                'success' => false,
                'message' => __('flash_sale.not_found'),
            ], 404);
        }

        $products = $sale->products->map(function ($item) {
            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product' => $item->product,
                'original_price' => $item->original_price,
                'sale_price' => $item->sale_price,
                'discount_percent' => $item->discount_percent,
                'quantity_limit' => $item->quantity_limit,
                'quantity_sold' => $item->quantity_sold,
                'remaining_quantity' => $item->remaining_quantity,
                'is_available' => $item->isAvailable(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $sale->id,
                'title' => $sale->title,
                'title_ar' => $sale->title_ar,
                'description' => $sale->description,
                'description_ar' => $sale->description_ar,
                'image_url' => $sale->image_url,
                'starts_at' => $sale->starts_at->toIso8601String(),
                'ends_at' => $sale->ends_at->toIso8601String(),
                'time_remaining_seconds' => $sale->time_remaining,
                'is_active' => $sale->isActive(),
                'products' => $products,
            ],
        ]);
    }

    /**
     * Get upcoming flash sales.
     */
    public function upcoming(): JsonResponse
    {
        $flashSales = FlashSale::getUpcoming(5);

        $data = $flashSales->map(function ($sale) {
            return [
                'id' => $sale->id,
                'title' => $sale->title,
                'title_ar' => $sale->title_ar,
                'image_url' => $sale->image_url,
                'starts_at' => $sale->starts_at->toIso8601String(),
                'ends_at' => $sale->ends_at->toIso8601String(),
                'starts_in_seconds' => now()->diffInSeconds($sale->starts_at, false),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
