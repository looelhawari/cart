<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
            'force.json' => \App\Http\Middleware\ForceJsonResponse::class,
            'security.headers' => \App\Http\Middleware\SecurityHeaders::class,
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'driver' => \App\Http\Middleware\DriverMiddleware::class,
            'password.confirm' => \App\Http\Middleware\RequirePasswordConfirmation::class,
            'log.admin.activity' => \App\Http\Middleware\LogAdminActivity::class,
            'gzip' => \App\Http\Middleware\GzipCompress::class,
            'permission' => \App\Http\Middleware\CheckPermission::class,
        ]);

        // Apply ForceJsonResponse, SecurityHeaders, Gzip, and SetLocale to all API routes
        $middleware->appendToGroup('api', [
            \App\Http\Middleware\ForceJsonResponse::class,
            \App\Http\Middleware\SecurityHeaders::class,
            \App\Http\Middleware\GzipCompress::class, // 60-80% bandwidth reduction
            \App\Http\Middleware\SetLocale::class,
        ]);

        // Prevent authentication redirects for API requests
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Throwable $e, $request) {
            if (! \App\Support\SafeApiExceptionResponse::shouldHandle($request)) {
                return null;
            }

            if ($e instanceof \Illuminate\Http\Exceptions\HttpResponseException) {
                return $e->getResponse();
            }

            return \App\Support\SafeApiExceptionResponse::render($e, $request);
        });
    })->create();
