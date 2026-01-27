<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
            'force.json' => \App\Http\Middleware\ForceJsonResponse::class,
            'security.headers' => \App\Http\Middleware\SecurityHeaders::class,
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'password.confirm' => \App\Http\Middleware\RequirePasswordConfirmation::class,
            'log.admin.activity' => \App\Http\Middleware\LogAdminActivity::class,
        ]);

        // Apply ForceJsonResponse and SecurityHeaders to all API routes
        $middleware->appendToGroup('api', [
            \App\Http\Middleware\ForceJsonResponse::class,
            \App\Http\Middleware\SecurityHeaders::class,
        ]);

        // Prevent authentication redirects for API requests
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
