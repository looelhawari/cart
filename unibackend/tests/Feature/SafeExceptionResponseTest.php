<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class SafeExceptionResponseTest extends TestCase
{
    public function test_unexpected_api_exception_returns_safe_message_without_trace(): void
    {
        Route::get('/api/v1/_test/safe-exception', function () {
            throw new \RuntimeException('Undefined variable in /app/Http/Controllers/UserController.php line 45');
        });

        $response = $this->getJson('/api/v1/_test/safe-exception');

        $response->assertStatus(500)
            ->assertJsonPath('success', false)
            ->assertJsonMissingPath('trace')
            ->assertJsonMissingPath('exception')
            ->assertJsonMissingPath('file')
            ->assertJsonMissingPath('line')
            ->assertJsonStructure(['success', 'message', 'error_id']);

        $body = $response->json();

        $this->assertStringContainsString('Something went wrong. Please try again later.', $body['message']);
        $this->assertStringNotContainsString('Undefined variable', json_encode($body));
        $this->assertStringNotContainsString('/app/Http/Controllers', json_encode($body));
    }

    public function test_validation_exception_returns_safe_validation_response(): void
    {
        Route::post('/api/v1/_test/safe-validation', function () {
            request()->validate(['email' => ['required', 'email']]);
        });

        $response = $this->postJson('/api/v1/_test/safe-validation', ['email' => 'not-an-email']);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Please check the entered data.')
            ->assertJsonStructure(['success', 'message', 'errors' => ['email']])
            ->assertJsonMissingPath('trace');
    }

    public function test_duplicate_database_exception_returns_safe_conflict_message(): void
    {
        Route::get('/api/v1/_test/safe-duplicate', function () {
            throw new QueryException(
                'mysql',
                'insert into users (email) values (?)',
                ['secret@example.com'],
                new \Exception("SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry 'secret@example.com' for key 'users_email_unique'")
            );
        });

        $response = $this->getJson('/api/v1/_test/safe-duplicate');

        $response->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'This data already exists.')
            ->assertJsonMissingPath('trace');

        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $this->assertStringNotContainsString('secret@example.com', $response->getContent());
    }

    public function test_not_found_response_is_safe_json(): void
    {
        $response = $this->getJson('/api/v1/_test/not-found-route');

        $response->assertStatus(404)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'The requested item could not be found.')
            ->assertJsonMissingPath('trace');
    }

    public function test_manual_error_response_is_sanitized_by_api_middleware(): void
    {
        Route::get('/api/v1/_test/manual-raw-error', function () {
            return response()->json([
                'success' => false,
                'message' => 'SQLSTATE[42S02]: Base table or view not found',
                'error' => 'Exception in /app/Http/Controllers/UserController.php line 45',
            ], 500);
        })->middleware(\App\Http\Middleware\ForceJsonResponse::class);

        $response = $this->getJson('/api/v1/_test/manual-raw-error');

        $response->assertStatus(500)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Something went wrong. Please try again later.')
            ->assertJsonPath('error', 'Something went wrong. Please try again later.');

        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $this->assertStringNotContainsString('/app/Http/Controllers', $response->getContent());
    }
}
