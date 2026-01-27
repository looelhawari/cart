<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    /**
     * Save push notification token for user
     */
    public function saveToken(Request $request)
    {
        try {
            $validated = $request->validate([
                'token' => 'required|string',
                'device_type' => 'nullable|string|in:ios,android,web',
            ]);

            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                ], 401);
            }

            // Store token in user's push_tokens column (JSON)
            $tokens = $user->push_tokens ?? [];
            
            // Check if token already exists
            $existingToken = collect($tokens)->first(function ($item) use ($validated) {
                return $item['token'] === $validated['token'];
            });

            if (!$existingToken) {
                $tokens[] = [
                    'token' => $validated['token'],
                    'device_type' => $validated['device_type'] ?? 'unknown',
                    'created_at' => now()->toISOString(),
                ];

                $user->push_tokens = $tokens;
                $user->save();

                Log::info('Push token saved', [
                    'user_id' => $user->id,
                    'token' => substr($validated['token'], 0, 20) . '...',
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Push notification token saved successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to save push token: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to save notification token',
            ], 500);
        }
    }

    /**
     * Remove push notification token
     */
    public function removeToken(Request $request)
    {
        try {
            $validated = $request->validate([
                'token' => 'required|string',
            ]);

            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                ], 401);
            }

            // Remove token from user's push_tokens
            $tokens = $user->push_tokens ?? [];
            $tokens = collect($tokens)->reject(function ($item) use ($validated) {
                return $item['token'] === $validated['token'];
            })->values()->all();

            $user->push_tokens = $tokens;
            $user->save();

            Log::info('Push token removed', [
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Push notification token removed successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to remove push token: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove notification token',
            ], 500);
        }
    }
}
