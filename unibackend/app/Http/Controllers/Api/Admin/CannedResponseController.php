<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CannedResponse;
use Illuminate\Http\Request;

class CannedResponseController extends Controller
{
    /**
     * Get all canned responses
     */
    public function index(Request $request)
    {
        $query = CannedResponse::query()->where('is_active', true);

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('content', 'like', "%{$search}%")
                    ->orWhere('shortcut', 'like', "%{$search}%");
            });
        }

        $responses = $query->orderBy('title')->get();

        return response()->json($responses);
    }

    /**
     * Store a new canned response
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'content' => 'required|string',
            'category' => 'nullable|string|max:50',
            'shortcut' => 'nullable|string|max:20|unique:canned_responses,shortcut',
        ]);

        $response = CannedResponse::create([
            ...$validated,
            'created_by' => auth()->id(),
        ]);

        return response()->json($response, 201);
    }

    /**
     * Get a single canned response
     */
    public function show(CannedResponse $cannedResponse)
    {
        return response()->json($cannedResponse);
    }

    /**
     * Update a canned response
     */
    public function update(Request $request, CannedResponse $cannedResponse)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:100',
            'content' => 'sometimes|string',
            'category' => 'nullable|string|max:50',
            'shortcut' => 'nullable|string|max:20|unique:canned_responses,shortcut,' . $cannedResponse->id,
            'is_active' => 'sometimes|boolean',
        ]);

        $cannedResponse->update($validated);

        return response()->json($cannedResponse);
    }

    /**
     * Delete a canned response
     */
    public function destroy(CannedResponse $cannedResponse)
    {
        $cannedResponse->delete();

        return response()->json(['message' => 'Canned response deleted']);
    }

    /**
     * Get available categories
     */
    public function categories()
    {
        $categories = CannedResponse::where('is_active', true)
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category');

        return response()->json($categories);
    }
}
