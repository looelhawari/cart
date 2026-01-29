<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StaticPage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StaticPageController extends Controller
{
    /**
     * Get a static page by slug for mobile app
     * This is a public endpoint
     */
    public function show(Request $request, string $slug)
    {
        try {
            // Validate slug
            if (!in_array($slug, StaticPage::VALID_SLUGS)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid page type',
                ], 400);
            }

            $page = StaticPage::where('slug', $slug)
                ->active()
                ->first();

            if (!$page) {
                return response()->json([
                    'success' => false,
                    'message' => 'Page not found or inactive',
                ], 404);
            }

            // Get preferred language from request header or query param
            $locale = $request->header('Accept-Language', $request->query('lang', 'en'));
            $locale = in_array($locale, ['ar', 'en']) ? $locale : 'en';

            return response()->json([
                'success' => true,
                'data' => [
                    'slug' => $page->slug,
                    'title' => $page->getTitle($locale),
                    'title_en' => $page->title_en,
                    'title_ar' => $page->title_ar,
                    'content' => $page->getContent($locale),
                    'content_en' => $page->content_en,
                    'content_ar' => $page->content_ar,
                    'last_updated_at' => $page->last_updated_at?->toISOString(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch static page: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch page',
            ], 500);
        }
    }

    /**
     * Get all active static pages
     */
    public function index(Request $request)
    {
        try {
            $locale = $request->header('Accept-Language', $request->query('lang', 'en'));
            $locale = in_array($locale, ['ar', 'en']) ? $locale : 'en';

            $pages = StaticPage::active()
                ->orderBy('slug')
                ->get()
                ->map(function ($page) use ($locale) {
                    return [
                        'slug' => $page->slug,
                        'title' => $page->getTitle($locale),
                        'title_en' => $page->title_en,
                        'title_ar' => $page->title_ar,
                        'last_updated_at' => $page->last_updated_at?->toISOString(),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $pages,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch static pages: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch pages',
            ], 500);
        }
    }
}
