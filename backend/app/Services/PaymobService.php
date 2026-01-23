<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class PaymobService
{
    private string $apiKey;
    private string $hmacSecret;
    private string $iframeId;
    private string $cardIntegrationId;
    private string $walletIntegrationId;
    private string $baseUrl = 'https://accept.paymob.com/api';

    public function __construct()
    {
        $this->apiKey = config('services.paymob.api_key');
        $this->hmacSecret = config('services.paymob.hmac_secret');
        $this->iframeId = config('services.paymob.iframe_id');
        $this->cardIntegrationId = config('services.paymob.card_integration_id');
        $this->walletIntegrationId = config('services.paymob.wallet_integration_id');
    }

    /**
     * Step 1: Authenticate with Paymob and get auth token.
     */
    public function authenticate(): string
    {
        try {
            $response = Http::timeout(30)
                ->connectTimeout(10)
                ->retry(3, 100)
                ->post("{$this->baseUrl}/auth/tokens", [
                'api_key' => $this->apiKey,
            ]);

            if (!$response->successful()) {
                Log::error('Paymob authentication failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new Exception('Paymob authentication failed');
            }

            $data = $response->json();

            if (!isset($data['token'])) {
                throw new Exception('No auth token returned from Paymob');
            }

            return $data['token'];
        } catch (Exception $e) {
            Log::error('Paymob authentication error', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Step 2: Register order with Paymob.
     */
    public function registerOrder(
        string $authToken,
        int $amountCents,
        string $internalOrderId,
        array $items = []
    ): int {
        try {
            $response = Http::timeout(30)
                ->connectTimeout(10)
                ->retry(3, 100)
                ->post("{$this->baseUrl}/ecommerce/orders", [
                'auth_token' => $authToken,
                'delivery_needed' => 'false',
                'amount_cents' => $amountCents,
                'currency' => 'EGP',
                'merchant_order_id' => $internalOrderId,
                'items' => $items,
            ]);

            if (!$response->successful()) {
                Log::error('Paymob order registration failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new Exception('Failed to register order with Paymob');
            }

            $data = $response->json();

            if (!isset($data['id'])) {
                throw new Exception('No order ID returned from Paymob');
            }

            return $data['id'];
        } catch (Exception $e) {
            Log::error('Paymob order registration error', [
                'error' => $e->getMessage(),
                'internal_order_id' => $internalOrderId,
            ]);
            throw $e;
        }
    }

    /**
     * Step 3: Generate payment key.
     */
    public function generatePaymentKey(
        string $authToken,
        int $amountCents,
        int $paymobOrderId,
        array $billingData,
        string $paymentMethod = 'CARD'
    ): string {
        try {
            // Get correct integration ID based on payment method
            $integrationId = $paymentMethod === 'WALLET'
                ? $this->walletIntegrationId
                : $this->cardIntegrationId;

            $response = Http::timeout(30)
                ->connectTimeout(10)
                ->retry(3, 100)
                ->post("{$this->baseUrl}/acceptance/payment_keys", [
                'auth_token' => $authToken,
                'amount_cents' => $amountCents,
                'expiration' => 3600, // 1 hour
                'order_id' => $paymobOrderId,
                'billing_data' => $billingData,
                'currency' => 'EGP',
                'integration_id' => $integrationId,
            ]);

            if (!$response->successful()) {
                Log::error('Paymob payment key generation failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new Exception('Failed to generate payment key');
            }

            $data = $response->json();

            if (!isset($data['token'])) {
                throw new Exception('No payment token returned from Paymob');
            }

            return $data['token'];
        } catch (Exception $e) {
            Log::error('Paymob payment key generation error', [
                'error' => $e->getMessage(),
                'order_id' => $paymobOrderId,
            ]);
            throw $e;
        }
    }

    /**
     * Verify HMAC signature from Paymob callback.
     */
    public function verifyHmac(array $data): bool
    {
        try {
            // Extract HMAC from callback
            $receivedHmac = $data['hmac'] ?? null;

            if (!$receivedHmac) {
                Log::warning('No HMAC provided in callback');
                return false;
            }

            // Extract obj if nested (Paymob sends 'obj' wrapper sometimes)
            $payload = $data['obj'] ?? $data;

            // Build the HMAC string according to Paymob specs
            // Use null coalescing to handle missing fields
            $concatenatedString =
                ($payload['amount_cents'] ?? '') .
                ($payload['created_at'] ?? '') .
                ($payload['currency'] ?? '') .
                (isset($payload['error_occured']) ? ($payload['error_occured'] ? 'true' : 'false') : '') .
                (isset($payload['has_parent_transaction']) ? ($payload['has_parent_transaction'] ? 'true' : 'false') : '') .
                ($payload['id'] ?? '') .
                ($payload['integration_id'] ?? '') .
                (isset($payload['is_3d_secure']) ? ($payload['is_3d_secure'] ? 'true' : 'false') : '') .
                (isset($payload['is_auth']) ? ($payload['is_auth'] ? 'true' : 'false') : '') .
                (isset($payload['is_capture']) ? ($payload['is_capture'] ? 'true' : 'false') : '') .
                (isset($payload['is_refunded']) ? ($payload['is_refunded'] ? 'true' : 'false') : '') .
                (isset($payload['is_standalone_payment']) ? ($payload['is_standalone_payment'] ? 'true' : 'false') : '') .
                (isset($payload['is_voided']) ? ($payload['is_voided'] ? 'true' : 'false') : '') .
                ($payload['order']['id'] ?? '') .
                ($payload['owner'] ?? '') .
                (isset($payload['pending']) ? ($payload['pending'] ? 'true' : 'false') : '') .
                ($payload['source_data']['pan'] ?? '') .
                ($payload['source_data']['sub_type'] ?? '') .
                ($payload['source_data']['type'] ?? '') .
                (isset($payload['success']) ? ($payload['success'] ? 'true' : 'false') : '');

            // Calculate HMAC
            $calculatedHmac = hash_hmac('sha512', $concatenatedString, $this->hmacSecret);

            // Compare
            $isValid = hash_equals($calculatedHmac, $receivedHmac);

            if (!$isValid) {
                Log::warning('HMAC verification failed', [
                    'received_hmac' => substr($receivedHmac, 0, 20) . '...',
                    'calculated_hmac' => substr($calculatedHmac, 0, 20) . '...',
                    'concatenated_length' => strlen($concatenatedString),
                ]);
            }

            return $isValid;
        } catch (Exception $e) {
            Log::error('HMAC verification error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * Get iframe URL for payment.
     */
    public function getIframeUrl(string $paymentToken): string
    {
        return "https://accept.paymob.com/api/acceptance/iframes/{$this->iframeId}?payment_token={$paymentToken}";
    }

    /**
     * Get integration ID based on payment method.
     */
    public function getIntegrationId(string $paymentMethod): string
    {
        return $paymentMethod === 'WALLET'
            ? $this->walletIntegrationId
            : $this->cardIntegrationId;
    }
}
