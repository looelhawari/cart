<?php

namespace App\Support;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

class SafeApiExceptionResponse
{
    private const TECHNICAL_MESSAGE_PATTERNS = [
        '/sqlstate/i',
        '/integrity constraint/i',
        '/queryexception/i',
        '/syntaxerror/i',
        '/typeerror/i',
        '/referenceerror/i',
        '/undefined variable/i',
        '/trying to access/i',
        '/call to a member function/i',
        '/stack trace/i',
        '/\btrace\b/i',
        '/\bline\s+\d+\b/i',
        '/\/app\//i',
        '/\\\\app\\\\/i',
        '/\.php/i',
        '/env\b/i',
        '/configured/i',
    ];

    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'current_password',
        'token',
        'access_token',
        'refresh_token',
        'authorization',
        'otp',
        'code',
        'card',
        'card_number',
        'cvv',
        'secret',
        'api_key',
        'private_key',
    ];

    public static function shouldHandle(Request $request): bool
    {
        return $request->is('api/*') || $request->expectsJson() || $request->wantsJson();
    }

    public static function render(Throwable $exception, Request $request): Response
    {
        [$status, $message, $errors] = self::safePayloadParts($exception);
        $payload = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        if ($status >= 500) {
            $errorId = 'ERR-' . strtoupper(Str::random(10));
            $payload['error_id'] = $errorId;
            $payload['message'] .= ' Error ID: ' . $errorId;

            self::logException($exception, $request, $errorId);
        } elseif ($exception instanceof QueryException) {
            self::logException($exception, $request);
        }

        return response()->json($payload, $status);
    }

    public static function sanitizePayload(array $payload, int $status): array
    {
        if ($status < 400) {
            return $payload;
        }

        if (array_key_exists('message', $payload)) {
            $payload['message'] = self::safeMessage(
                $payload['message'],
                $status,
                self::messageForStatus($status)
            );
        }

        if (array_key_exists('error', $payload)) {
            $payload['error'] = self::safeMessage(
                $payload['error'],
                $status,
                self::messageForStatus($status)
            );
        }

        return $payload;
    }

    public static function safeMessage(mixed $message, int $status = 500, string $fallback = 'Something went wrong. Please try again later.'): string
    {
        if (is_string($message)) {
            $normalized = trim($message);

            if ($normalized !== ''
                && strlen($normalized) <= 240
                && ! self::isTechnicalMessage($normalized)) {
                return $normalized;
            }
        }

        return $fallback ?: self::messageForStatus($status);
    }

    private static function safePayloadParts(Throwable $exception): array
    {
        if ($exception instanceof ValidationException) {
            return [
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
                'Please check the entered data.',
                $exception->errors(),
            ];
        }

        if ($exception instanceof AuthenticationException) {
            return [HttpResponse::HTTP_UNAUTHORIZED, 'Please log in to continue.', null];
        }

        if ($exception instanceof AuthorizationException) {
            return [HttpResponse::HTTP_FORBIDDEN, 'You do not have permission to perform this action.', null];
        }

        if ($exception instanceof ModelNotFoundException || $exception instanceof NotFoundHttpException) {
            return [HttpResponse::HTTP_NOT_FOUND, 'The requested item could not be found.', null];
        }

        if ($exception instanceof MethodNotAllowedHttpException) {
            return [HttpResponse::HTTP_METHOD_NOT_ALLOWED, 'This action is not available.', null];
        }

        if ($exception instanceof TooManyRequestsHttpException) {
            return [HttpResponse::HTTP_TOO_MANY_REQUESTS, 'Too many requests. Please slow down.', null];
        }

        if ($exception instanceof PostTooLargeException) {
            return [HttpResponse::HTTP_REQUEST_ENTITY_TOO_LARGE, 'The selected file is too large.', null];
        }

        if ($exception instanceof TokenMismatchException) {
            return [419, 'Your session has expired. Please log in again.', null];
        }

        if ($exception instanceof QueryException) {
            if (self::isDuplicateRecord($exception)) {
                return [HttpResponse::HTTP_CONFLICT, 'This data already exists.', null];
            }

            return [HttpResponse::HTTP_INTERNAL_SERVER_ERROR, 'Something went wrong. Please try again later.', null];
        }

        if ($exception instanceof HttpExceptionInterface) {
            return [
                $exception->getStatusCode(),
                self::messageForStatus($exception->getStatusCode()),
                null,
            ];
        }

        return [HttpResponse::HTTP_INTERNAL_SERVER_ERROR, 'Something went wrong. Please try again later.', null];
    }

    private static function isDuplicateRecord(QueryException $exception): bool
    {
        $message = $exception->getMessage();
        $code = (string) $exception->getCode();

        return $code === '23000'
            || str_contains($message, 'SQLSTATE[23000]')
            || str_contains($message, '1062 Duplicate')
            || str_contains(strtolower($message), 'unique constraint');
    }

    private static function messageForStatus(int $status): string
    {
        return match ($status) {
            HttpResponse::HTTP_UNAUTHORIZED => 'Please log in to continue.',
            HttpResponse::HTTP_FORBIDDEN => 'You do not have permission to perform this action.',
            HttpResponse::HTTP_NOT_FOUND => 'The requested item could not be found.',
            HttpResponse::HTTP_CONFLICT => 'This data already exists.',
            HttpResponse::HTTP_UNPROCESSABLE_ENTITY => 'Please check the entered data.',
            HttpResponse::HTTP_TOO_MANY_REQUESTS => 'Too many requests. Please slow down.',
            default => $status >= 500
                ? 'Something went wrong. Please try again later.'
                : 'We could not complete your request right now.',
        };
    }

    private static function isTechnicalMessage(string $message): bool
    {
        foreach (self::TECHNICAL_MESSAGE_PATTERNS as $pattern) {
            if (preg_match($pattern, $message) === 1) {
                return true;
            }
        }

        return false;
    }

    private static function logException(Throwable $exception, Request $request, ?string $errorId = null): void
    {
        Log::error('API exception handled safely', [
            'error_id' => $errorId,
            'method' => $request->method(),
            'path' => $request->path(),
            'user_id' => $request->user()?->id,
            'ip' => $request->ip(),
            'input' => self::redact($request->except(self::SENSITIVE_KEYS)),
            'exception_class' => $exception::class,
            'exception_message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }

    private static function redact(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }

        $redacted = [];

        foreach ($value as $key => $item) {
            $keyString = strtolower((string) $key);
            $isSensitive = collect(self::SENSITIVE_KEYS)->contains(
                fn (string $sensitive) => str_contains($keyString, $sensitive)
            );

            $redacted[$key] = $isSensitive ? '[REDACTED]' : self::redact($item);
        }

        return $redacted;
    }
}
