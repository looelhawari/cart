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

    // ═══════════════════════════════════════════════════════
    // CARD TOKENIZATION (Phase 2 - Paymob Card-on-File)
    // ═══════════════════════════════════════════════════════

    /**
     * Generate payment key WITH card save flag.
     * When $saveCard = true, Paymob will tokenize the card after successful payment.
     *
     * @param string $authToken
     * @param int $amountCents
     * @param int $paymobOrderId
     * @param array $billingData
     * @param string $paymentMethod
     * @param bool $saveCard - True if user checked "Save this card"
     * @return array ['payment_token' => string, 'save_card_requested' => bool]
     */
    public function generatePaymentKeyWithCardSave(
        string $authToken,
        int $amountCents,
        int $paymobOrderId,
        array $billingData,
        string $paymentMethod = 'CARD',
        bool $saveCard = false
    ): array {
        try {
            $integrationId = $paymentMethod === 'WALLET'
                ? $this->walletIntegrationId
                : $this->cardIntegrationId;

            $payload = [
                'auth_token' => $authToken,
                'amount_cents' => $amountCents,
                'expiration' => 3600, // 1 hour
                'order_id' => $paymobOrderId,
                'billing_data' => $billingData,
                'currency' => 'EGP',
                'integration_id' => $integrationId,
            ];

            // ✅ Request card tokenization if user opted in
            if ($saveCard && $paymentMethod === 'CARD') {
                $payload['save_card'] = true;

                Log::info('Requesting card tokenization', [
                    'order_id' => $paymobOrderId,
                    'save_card' => true,
                ]);
            }

            $response = Http::timeout(30)
                ->connectTimeout(10)
                ->retry(3, 100)
                ->post("{$this->baseUrl}/acceptance/payment_keys", $payload);

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

            return [
                'payment_token' => $data['token'],
                'save_card_requested' => $saveCard,
            ];

        } catch (Exception $e) {
            Log::error('Paymob payment key generation error', [
                'error' => $e->getMessage(),
                'order_id' => $paymobOrderId,
            ]);
            throw $e;
        }
    }

    /**
     * Pay with saved card token (Paymob Card-on-File).
     * Uses existing Paymob card token instead of requiring card entry.
     *
     * @param string $authToken
     * @param int $amountCents
     * @param int $paymobOrderId
     * @param string $cardToken - The saved Paymob card token (decrypted)
     * @param array $billingData
     * @return string Payment token for iframe (may still require 3DS)
     */
    public function payWithSavedCard(
        string $authToken,
        int $amountCents,
        int $paymobOrderId,
        string $cardToken,
        array $billingData
    ): string {
        try {
            $payload = [
                'auth_token' => $authToken,
                'amount_cents' => $amountCents,
                'expiration' => 3600,
                'order_id' => $paymobOrderId,
                'billing_data' => $billingData,
                'currency' => 'EGP',
                'integration_id' => $this->cardIntegrationId,
                'card_token' => $cardToken, // ✅ Use saved card token
            ];

            Log::info('Initiating saved card payment', [
                'order_id' => $paymobOrderId,
                'amount_cents' => $amountCents,
                'has_card_token' => !empty($cardToken),
            ]);

            $response = Http::timeout(30)
                ->connectTimeout(10)
                ->retry(3, 100)
                ->post("{$this->baseUrl}/acceptance/payment_keys", $payload);

            if (!$response->successful()) {
                Log::error('Paymob saved card payment failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new Exception('Failed to process saved card payment');
            }

            $data = $response->json();

            if (!isset($data['token'])) {
                throw new Exception('No payment token returned from Paymob');
            }

            Log::info('Saved card payment token generated', [
                'order_id' => $paymobOrderId,
            ]);

            return $data['token'];

        } catch (Exception $e) {
            Log::error('Paymob saved card payment error', [
                'error' => $e->getMessage(),
                'order_id' => $paymobOrderId,
            ]);
            throw $e;
        }
    }

    /**
     * Extract card token from Paymob webhook callback.
     * Called after first successful payment when user opted to save card.
     *
     * Paymob sends card token in: obj.source_data.token
     *
     * @param array $callbackData - The webhook 'obj' payload
     * @return array|null ['token' => string, 'last4' => string, 'brand' => string, ...]
     */
    public function extractCardTokenFromCallback(array $callbackData): ?array
    {
        // Token is in source_data.token after successful payment
        if (!isset($callbackData['source_data']['token'])) {
            Log::debug('No card token in callback', [
                'has_source_data' => isset($callbackData['source_data']),
            ]);
            return null;
        }

        $sourceData = $callbackData['source_data'];

        // Validate token exists and is not empty
        if (empty($sourceData['token'])) {
            Log::warning('Empty card token in callback');
            return null;
        }

        // Extract card details
        $cardData = [
            'token' => $sourceData['token'],
            'last4' => $this->extractLast4Digits($sourceData['pan'] ?? null),
            'brand' => $this->normalizeCardBrand($sourceData['sub_type'] ?? 'other'),
        ];

        // Optional: Extract expiry if provided (Paymob may not always send this)
        if (isset($sourceData['expiry_month']) && isset($sourceData['expiry_year'])) {
            $cardData['expiry_month'] = $sourceData['expiry_month'];
            $cardData['expiry_year'] = $sourceData['expiry_year'];
        }

        Log::info('Card token extracted from callback', [
            'has_token' => true,
            'last4' => $cardData['last4'],
            'brand' => $cardData['brand'],
            'has_expiry' => isset($cardData['expiry_month']),
        ]);

        return $cardData;
    }

    /**
     * Normalize card brand from Paymob to our enum values.
     * Paymob sends: "VISA", "MasterCard", "American Express", etc.
     * We store: visa, mastercard, amex, discover, other
     *
     * @param string $paymobBrand
     * @return string
     */
    private function normalizeCardBrand(string $paymobBrand): string
    {
        $normalized = match(strtolower(trim($paymobBrand))) {
            'visa' => 'visa',
            'mastercard', 'master card', 'mc' => 'mastercard',
            'american express', 'amex' => 'amex',
            'discover' => 'discover',
            default => 'other',
        };

        Log::debug('Card brand normalized', [
            'paymob_brand' => $paymobBrand,
            'normalized_brand' => $normalized,
        ]);

        return $normalized;
    }

    /**
     * Extract last 4 digits from PAN.
     * Paymob sends masked PAN like "424242XXXXXX4242" or just "4242".
     *
     * @param string|null $pan
     * @return string
     */
    private function extractLast4Digits(?string $pan): string
    {
        if (!$pan) {
            return '0000';
        }

        // Remove any non-digit characters
        $digitsOnly = preg_replace('/\D/', '', $pan);

        // Get last 4 digits
        $last4 = substr($digitsOnly, -4);

        // Ensure it's exactly 4 digits
        return str_pad($last4, 4, '0', STR_PAD_LEFT);
    }
}
