<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;

class AdminLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'user_name',
        'user_email',
        'user_role',
        'action',
        'action_type',
        'action_description',
        'entity_type',
        'entity_id',
        'entity_name',
        'http_method',
        'route_name',
        'url',
        'ip_address',
        'user_agent',
        'request_data',
        'old_values',
        'new_values',
        'changes',
        'response_status',
        'is_successful',
        'error_message',
        'module',
        'session_id',
        'metadata',
    ];

    protected $casts = [
        'request_data' => 'array',
        'old_values' => 'array',
        'new_values' => 'array',
        'changes' => 'array',
        'metadata' => 'array',
        'is_successful' => 'boolean',
    ];

    /**
     * Sensitive fields that should be sanitized
     */
    protected static array $sensitiveFields = [
        'password',
        'password_confirmation',
        'current_password',
        'new_password',
        'token',
        'api_key',
        'secret',
        'credit_card',
        'cvv',
        'card_number',
        'authorization',
    ];

    /**
     * Get the user that performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Log an admin action with full details.
     */
    public static function logAction(
        string $action,
        string $actionType,
        ?string $entityType = null,
        ?int $entityId = null,
        ?string $entityName = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $description = null,
        ?array $metadata = null
    ): self {
        $request = request();
        $user = $request->user();

        // Calculate changes if we have old and new values
        $changes = null;
        if ($oldValues && $newValues) {
            $changes = self::calculateChanges($oldValues, $newValues);
        }

        return self::create([
            'user_id' => $user?->id,
            'user_name' => $user ? ($user->first_name . ' ' . $user->last_name) : null,
            'user_email' => $user?->email,
            'user_role' => $user?->role,
            'action' => $action,
            'action_type' => $actionType,
            'action_description' => $description ?? self::generateDescription($action, $entityType, $entityName),
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'entity_name' => $entityName,
            'http_method' => $request->method(),
            'route_name' => $request->route()?->getName(),
            'url' => $request->fullUrl(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'request_data' => self::sanitizeData($request->except(self::$sensitiveFields)),
            'old_values' => $oldValues ? self::sanitizeData($oldValues) : null,
            'new_values' => $newValues ? self::sanitizeData($newValues) : null,
            'changes' => $changes,
            'response_status' => null, // Will be set later if needed
            'is_successful' => true,
            'module' => self::extractModule($request),
            'session_id' => session()->getId(),
            'metadata' => $metadata,
        ]);
    }

    /**
     * Log from middleware (after response).
     */
    public static function logFromMiddleware(
        Request $request,
        int $responseStatus,
        ?array $metadata = null
    ): self {
        $user = $request->user();
        $actionDetails = self::extractActionDetails($request);

        return self::create([
            'user_id' => $user?->id,
            'user_name' => $user ? ($user->first_name . ' ' . $user->last_name) : null,
            'user_email' => $user?->email,
            'user_role' => $user?->role,
            'action' => $actionDetails['action'],
            'action_type' => $actionDetails['action_type'],
            'action_description' => $actionDetails['description'],
            'entity_type' => $actionDetails['entity_type'],
            'entity_id' => $actionDetails['entity_id'],
            'entity_name' => null,
            'http_method' => $request->method(),
            'route_name' => $request->route()?->getName(),
            'url' => $request->fullUrl(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'request_data' => self::sanitizeData($request->except(self::$sensitiveFields)),
            'old_values' => null,
            'new_values' => null,
            'changes' => null,
            'response_status' => $responseStatus,
            'is_successful' => $responseStatus >= 200 && $responseStatus < 400,
            'error_message' => $responseStatus >= 400 ? 'Request failed with status ' . $responseStatus : null,
            'module' => self::extractModule($request),
            'session_id' => session()->getId(),
            'metadata' => $metadata,
        ]);
    }

    /**
     * Extract action details from request.
     */
    protected static function extractActionDetails(Request $request): array
    {
        $method = $request->method();
        $path = $request->path();
        $segments = explode('/', $path);

        // Determine action type from HTTP method
        $actionType = match ($method) {
            'POST' => 'create',
            'PUT', 'PATCH' => 'update',
            'DELETE' => 'delete',
            'GET' => 'read',
            default => 'unknown',
        };

        // Extract entity type and ID from URL
        $entityType = null;
        $entityId = null;
        
        // Look for common patterns in admin routes
        foreach ($segments as $i => $segment) {
            if (in_array($segment, ['products', 'categories', 'orders', 'users', 'promotions', 'promo-codes', 'support', 'refunds', 'financial'])) {
                $entityType = rtrim($segment, 's'); // Remove trailing 's'
                if ($entityType === 'categorie') $entityType = 'category';
                if ($entityType === 'promo-code') $entityType = 'promo_code';
                
                // Check if next segment is an ID
                if (isset($segments[$i + 1]) && is_numeric($segments[$i + 1])) {
                    $entityId = (int) $segments[$i + 1];
                }
                break;
            }
        }

        // Build action name
        $action = $actionType;
        if ($entityType) {
            $action .= '_' . $entityType;
        }

        // Generate description
        $description = ucfirst($actionType) . 'd';
        if ($entityType) {
            $description .= ' ' . str_replace('_', ' ', $entityType);
            if ($entityId) {
                $description .= ' #' . $entityId;
            }
        }

        return [
            'action' => $action,
            'action_type' => $actionType,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'description' => $description,
        ];
    }

    /**
     * Extract module from request path.
     */
    protected static function extractModule(Request $request): ?string
    {
        $path = $request->path();
        
        $modulePatterns = [
            'products' => 'products',
            'categories' => 'categories',
            'orders' => 'orders',
            'users' => 'users',
            'promotions' => 'promotions',
            'promo-codes' => 'promo_codes',
            'support' => 'support',
            'financial' => 'financial',
            'analytics' => 'analytics',
            'refunds' => 'refunds',
            'activity-logs' => 'activity_logs',
            'admin-logs' => 'admin_logs',
        ];

        foreach ($modulePatterns as $pattern => $module) {
            if (str_contains($path, $pattern)) {
                return $module;
            }
        }

        return null;
    }

    /**
     * Sanitize sensitive data.
     */
    protected static function sanitizeData(array $data): array
    {
        $sanitized = [];
        
        foreach ($data as $key => $value) {
            if (in_array(strtolower($key), self::$sensitiveFields)) {
                $sanitized[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                $sanitized[$key] = self::sanitizeData($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }

    /**
     * Calculate changes between old and new values.
     */
    protected static function calculateChanges(array $oldValues, array $newValues): array
    {
        $changes = [];
        
        foreach ($newValues as $key => $newValue) {
            $oldValue = $oldValues[$key] ?? null;
            
            if ($oldValue !== $newValue) {
                $changes[$key] = [
                    'old' => $oldValue,
                    'new' => $newValue,
                ];
            }
        }

        return $changes;
    }

    /**
     * Generate a human-readable description.
     */
    protected static function generateDescription(string $action, ?string $entityType, ?string $entityName): string
    {
        $parts = explode('_', $action);
        $actionVerb = ucfirst($parts[0]);
        
        $description = $actionVerb;
        
        if ($entityType) {
            $description .= ' ' . str_replace('_', ' ', $entityType);
        }
        
        if ($entityName) {
            $description .= ': ' . $entityName;
        }

        return $description;
    }

    /**
     * Scope to filter by module.
     */
    public function scopeModule($query, string $module)
    {
        return $query->where('module', $module);
    }

    /**
     * Scope to filter by action type.
     */
    public function scopeActionType($query, string $actionType)
    {
        return $query->where('action_type', $actionType);
    }

    /**
     * Scope to filter by user.
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to filter successful actions.
     */
    public function scopeSuccessful($query)
    {
        return $query->where('is_successful', true);
    }

    /**
     * Scope to filter failed actions.
     */
    public function scopeFailed($query)
    {
        return $query->where('is_successful', false);
    }

    /**
     * Scope to filter by date range.
     */
    public function scopeDateRange($query, string $from, string $to)
    {
        return $query->whereBetween('created_at', [$from, $to . ' 23:59:59']);
    }
}
