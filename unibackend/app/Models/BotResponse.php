<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class BotResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'intent',
        'category',
        'keywords',
        'response_en',
        'response_ar',
        'action_type',
        'action_data',
        'priority',
        'is_active',
    ];

    protected $casts = [
        'keywords' => 'array',
        'action_data' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Find matching response based on message and category
     */
    public static function findMatch(string $message, ?string $category = null): ?self
    {
        $message = strtolower(trim($message));
        
        $query = self::where('is_active', true)
            ->orderByDesc('priority');

        if ($category) {
            $query->where(function ($q) use ($category) {
                $q->where('category', $category)
                  ->orWhereNull('category');
            });
        }

        $responses = $query->get();

        foreach ($responses as $response) {
            $keywords = $response->keywords;
            foreach ($keywords as $keyword) {
                if (str_contains($message, strtolower($keyword))) {
                    return $response;
                }
            }
        }

        return null;
    }

    /**
     * Get response in specified language
     */
    public function getResponse(string $lang = 'en'): string
    {
        return $lang === 'ar' ? $this->response_ar : $this->response_en;
    }
}
