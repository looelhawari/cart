<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class PaymobService
{
    private string $apiKey;
    private string $secretKey;
    private string $hmacSecret;
    private string $publicKey;
    private string $iframeId;
    private string $cardIntegrationId;
    private string $integrationId3DS;
    private string $motoIntegrationId;
    private string $walletIntegrationId;
    private string $callbackUrl;
    private string $currency;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services.paymob.api_key');
        $this->secretKey = config('services.paymob.secret_key');
        $this->hmacSecret = config('services.paymob.hmac_secret');
        $this->publicKey = config('services.paymob.public_key');
        $this->iframeId = config('services.paymob.iframe_id');
        $this->cardIntegrationId = config('services.paymob.card_integration_id');
        $this->integrationId3DS = config('services.paymob.integration_id_3ds');
        $this->motoIntegrationId = config('services.paymob.moto_integration_id', '');
        $this->walletIntegrationId = config('services.paymob.wallet_integration_id');
        $this->callbackUrl = config('services.paymob.callback_url');
        $this->currency = config('services.paymob.currency', 'EGP');
        $this->baseUrl = config('services.paymob.base_url', 'https://accept.paymob.com/api');
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

    // ═══════════════════════════════════════════════════════════════
    // NEW: INTENTION API + UNIFIED CHECKOUT (3DS with Tokenization)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create Paymob Intention for Unified Checkout (3DS flow with tokenization).
     *
     * Used for:
     * - First-time card save (token generation)
     * - Fallback when MOTO fails or requires 3DS
     * - High-value orders that mandate 3DS
     *
     * Based on Paymob documentation sample:
     * POST https://accept.paymob.com/v1/intention
     *
     * @param array $intentionData Must contain:
     *   - amount_cents (int)
     *   - billing (array): first_name, last_name, email, phone, etc.
     *   - items (array): order items
     *   - internal_reference (string): our payment attempt ID or order ID
     *   - redirection_url (string): where to redirect after payment
     *   - saved_card_token (string, optional): pre-fill saved card
     *
     * @return array ['intention_id', 'client_secret', 'unified_checkout_url']
     * @throws Exception
     */
    public function createIntention(array $intentionData): array
    {
        try {
            $endpoint = 'https://accept.paymob.com/v1/intention/';

            // Build request payload matching Paymob docs
            $payload = [
                'amount' => $intentionData['amount_cents'], // Integer in cents
                'currency' => $this->currency,

                // Specify which payment methods to show in Unified Checkout
                'payment_methods' => [
                    (int) $this->integrationId3DS, // Your 3DS integration ID
                ],

                // Billing data (required by Paymob)
                'billing_data' => [
                    'first_name' => $intentionData['billing']['first_name'] ?? 'Guest',
                    'last_name' => $intentionData['billing']['last_name'] ?? 'User',
                    'email' => $intentionData['billing']['email'] ?? 'guest@example.com',
                    'phone_number' => $intentionData['billing']['phone'] ?? '+201000000000',
                    'country' => $intentionData['billing']['country'] ?? 'EG',
                    'city' => $intentionData['billing']['city'] ?? 'Cairo',
                    'street' => $intentionData['billing']['street'] ?? 'N/A',
                    'building' => $intentionData['billing']['building'] ?? 'N/A',
                    'floor' => $intentionData['billing']['floor'] ?? 'N/A',
                    'apartment' => $intentionData['billing']['apartment'] ?? 'N/A',
                    'state' => $intentionData['billing']['state'] ?? '',
                    'postal_code' => $intentionData['billing']['postal_code'] ?? '',
                ],

                // Items (for fraud detection + reporting)
                'items' => $intentionData['items'] ?? [],

                // Webhook + Redirect URLs
                'notification_url' => $this->callbackUrl,
                'redirection_url' => $intentionData['redirection_url'],

                // Special reference for mapping webhook to our payment attempt
                'special_reference' => $intentionData['internal_reference'],
            ];

            // OPTIONAL: If paying with already saved card (pre-fill card in UI)
            if (!empty($intentionData['saved_card_token'])) {
                $payload['card_tokens'] = [$intentionData['saved_card_token']];
            }

            // Add extras if provided
            if (!empty($intentionData['extras'])) {
                $payload['extras'] = $intentionData['extras'];
            }

            Log::info('🔐 Creating Paymob Intention (Unified Checkout)', [
                'amount_cents' => $payload['amount'],
                'currency' => $payload['currency'],
                'has_saved_card' => !empty($intentionData['saved_card_token']),
                'special_reference' => $payload['special_reference'],
            ]);

            $response = Http::timeout(30)
                ->retry(2, 1000)
                ->withHeaders([
                    'Authorization' => 'Token ' . $this->secretKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($endpoint, $payload);

            if (!$response->successful()) {
                Log::error('❌ Paymob Intention API failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new Exception('Failed to create Paymob intention: ' . $response->body());
            }

            $data = $response->json();

            // Extract client_secret for Unified Checkout URL
            $clientSecret = $data['client_secret'] ?? null;
            $intentionId = $data['id'] ?? null;

            if (!$clientSecret || !$intentionId) {
                throw new Exception('Invalid Paymob intention response: missing client_secret or id');
            }

            // Build Unified Checkout URL
            $unifiedCheckoutUrl = "https://accept.paymob.com/unifiedcheckout/"
                . "?publicKey={$this->publicKey}"
                . "&clientSecret={$clientSecret}";

            Log::info('✅ Paymob Intention created successfully', [
                'intention_id' => $intentionId,
            ]);

            return [
                'intention_id' => $intentionId,
                'client_secret' => $clientSecret,
                'unified_checkout_url' => $unifiedCheckoutUrl,
                'payment_keys' => $data['payment_keys'] ?? [],
                'card_tokens' => $data['card_tokens'] ?? [],
            ];

        } catch (Exception $e) {
            Log::error('❌ Paymob Intention creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // NEW: MOTO PAYMENT (One-Click Server-to-Server via Intention API)
    // Per Paymob docs: https://developers.paymob.com/paymob-docs/developers/pay-with-saved-cards/mit
    // ═══════════════════════════════════════════════════════════════

    /**
     * Step 1 of MOTO: Create Intention with MOTO integration ID.
     *
     * Unlike Unified Checkout which uses 3DS integration, MOTO uses
     * a dedicated MOTO integration ID. The response contains
     * payment_keys[0].key which is the payment_token for Step 2.
     *
     * @param int $amountCents Amount in cents (piasters)
     * @param array $billingData Billing information
     * @param array $items Order items for fraud detection
     * @param string $specialReference Internal reference to correlate with our payment
     * @return array ['intention_id', 'payment_token', 'paymob_order_id']
     * @throws Exception
     */
    public function createMotoIntention(
        int $amountCents,
        array $billingData,
        array $items,
        string $specialReference
    ): array {
        try {
            if (empty($this->motoIntegrationId)) {
                throw new Exception('MOTO integration ID not configured. Set PAYMOB_MOTO_INTEGRATION_ID in .env');
            }

            $endpoint = 'https://accept.paymob.com/v1/intention/';

            $payload = [
                'amount' => $amountCents,
                'currency' => $this->currency,
                'payment_methods' => [(int) $this->motoIntegrationId],
                'items' => $items,
                'billing_data' => [
                    'first_name' => $billingData['first_name'] ?? 'Customer',
                    'last_name' => $billingData['last_name'] ?? ' ',
                    'email' => $billingData['email'] ?? 'customer@example.com',
                    'phone_number' => $billingData['phone_number'] ?? '+201000000000',
                    'country' => $billingData['country'] ?? 'EG',
                    'city' => $billingData['city'] ?? 'Cairo',
                    'street' => $billingData['street'] ?? 'N/A',
                    'building' => $billingData['building'] ?? 'N/A',
                    'floor' => $billingData['floor'] ?? 'N/A',
                    'apartment' => $billingData['apartment'] ?? 'N/A',
                    'state' => $billingData['state'] ?? '',
                ],
                'notification_url' => $this->callbackUrl,
                'special_reference' => $specialReference,
            ];

            Log::info('🔐 Creating MOTO Intention (saved card payment)', [
                'amount_cents' => $amountCents,
                'moto_integration_id' => $this->motoIntegrationId,
                'special_reference' => $specialReference,
            ]);

            $response = Http::timeout(30)
                ->retry(2, 1000)
                ->withHeaders([
                    'Authorization' => 'Token ' . $this->secretKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($endpoint, $payload);

            if (!$response->successful()) {
                Log::error('❌ MOTO Intention API failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new Exception('Failed to create MOTO intention: ' . $response->body());
            }

            $data = $response->json();
            $intentionId = $data['id'] ?? null;
            $paymentKeys = $data['payment_keys'] ?? [];

            if (!$intentionId) {
                throw new Exception('Invalid MOTO intention response: missing id');
            }

            // Extract the MOTO payment token from payment_keys
            $paymentToken = null;
            if (!empty($paymentKeys) && isset($paymentKeys[0]['key'])) {
                $paymentToken = $paymentKeys[0]['key'];
            }

            if (!$paymentToken) {
                throw new Exception('MOTO intention response missing payment_keys[0].key');
            }

            // Extract Paymob's order ID from the intention
            $paymobOrderId = $data['intention_order_id'] ?? $data['order'] ?? null;

            Log::info('✅ MOTO Intention created successfully', [
                'intention_id' => $intentionId,
                'has_payment_token' => !empty($paymentToken),
                'paymob_order_id' => $paymobOrderId,
            ]);

            return [
                'intention_id' => $intentionId,
                'payment_token' => $paymentToken,
                'paymob_order_id' => $paymobOrderId,
                'client_secret' => $data['client_secret'] ?? null,
            ];

        } catch (Exception $e) {
            Log::error('❌ MOTO Intention creation failed', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Step 2 of MOTO: Pay with saved card token.
     * Server-to-server payment, NO user interaction, NO 3DS.
     *
     * Per Paymob MIT docs:
     * POST https://accept.paymob.com/api/acceptance/payments/pay
     * Body: { source: { identifier: <card_token>, subtype: "TOKEN" }, payment_token: <from intention> }
     *
     * @param string $savedCardToken Paymob saved card token (from payment_methods.paymob_card_token)
     * @param string $paymentToken payment_keys[0].key from createMotoIntention()
     * @return array MOTO payment result with 'success', 'transaction_id', 'requires_3ds', etc.
     * @throws Exception
     */
    public function payWithSavedCardMoto(string $savedCardToken, string $paymentToken): array
    {
        try {
            $endpoint = 'https://accept.paymob.com/api/acceptance/payments/pay';

            $payload = [
                'source' => [
                    'identifier' => $savedCardToken,  // ⭐ Paymob saved card token
                    'subtype' => 'TOKEN',
                ],
                'payment_token' => $paymentToken,     // ⭐ From MOTO Intention payment_keys[0].key
            ];

            Log::info('💳 MOTO pay request (saved card)', [
                'has_card_token' => !empty($savedCardToken),
                'has_payment_token' => !empty($paymentToken),
            ]);

            $response = Http::timeout(30)
                ->retry(1, 500)
                ->post($endpoint, $payload);

            if (!$response->successful()) {
                Log::warning('⚠️ MOTO payment failed or requires action', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                $errorData = $response->json() ?? [];

                // Check if 3DS required (common fallback scenario)
                if ($this->requiresRedirection($errorData)) {
                    return [
                        'success' => false,
                        'requires_3ds' => true,
                        'redirect_url' => $errorData['redirect_url'] ?? $errorData['redirection_url'] ?? null,
                        'message' => 'MOTO declined, 3DS authentication required',
                        'data' => $errorData,
                    ];
                }

                return [
                    'success' => false,
                    'requires_3ds' => false,
                    'error' => $errorData['message'] ?? $errorData['data.message'] ?? 'MOTO payment failed',
                    'data' => $errorData,
                ];
            }

            $data = $response->json();
            $success = ($data['success'] ?? 'false') === 'true' || ($data['success'] ?? false) === true;
            $pending = ($data['pending'] ?? 'false') === 'true' || ($data['pending'] ?? false) === true;

            // Check if redirection required even on "success"
            $requiresRedirect = $this->requiresRedirection($data);

            if ($requiresRedirect) {
                Log::info('⚠️ MOTO requires redirection (3DS challenge)', [
                    'transaction_id' => $data['id'] ?? null,
                    'pending' => $pending,
                ]);

                return [
                    'success' => false,
                    'requires_3ds' => true,
                    'redirect_url' => $data['redirect_url'] ?? $data['redirection_url'] ?? null,
                    'transaction_id' => $data['id'] ?? null,
                    'message' => 'MOTO requires 3DS authentication',
                    'data' => $data,
                ];
            }

            Log::info('✅ MOTO payment successful', [
                'transaction_id' => $data['id'] ?? null,
                'success' => $success,
                'pending' => $pending,
            ]);

            return [
                'success' => $success,
                'pending' => $pending,
                'transaction_id' => $data['id'] ?? null,
                'requires_3ds' => false,
                'data' => $data,
            ];

        } catch (Exception $e) {
            Log::error('❌ MOTO payment exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Check if MOTO response requires redirection (3DS challenge).
     *
     * Per Paymob docs, even MOTO can return use_redirection: true
     * when 3DS authentication is required by the issuing bank.
     */
    private function requiresRedirection(array $response): bool
    {
        // Check explicit redirection flag
        if (!empty($response['use_redirection'])) {
            return true;
        }

        // Check if redirection URL provided
        if (!empty($response['redirect_url']) || !empty($response['redirection_url'])) {
            return true;
        }

        // Check for 3DS URL
        if (!empty($response['3ds_url'])) {
            return true;
        }

        // Check pending status (might need user action)
        $pending = ($response['pending'] ?? 'false') === 'true' || ($response['pending'] ?? false) === true;
        $is3DS = ($response['is_3d_secure'] ?? 'false') === 'true' || ($response['is_3d_secure'] ?? false) === true;

        return $pending && $is3DS;
    }

    // ═══════════════════════════════════════════════════════════════
    // NEW: TOKEN EXTRACTION FROM INTENTION WEBHOOK
    // ═══════════════════════════════════════════════════════════════

    /**
     * Extract card token from Intention API webhook.
     * Handles new token object structure from Unified Checkout.
     *
     * Expected webhook structure per Paymob docs:
     * {
     *   "obj": {
     *     "token": {
     *       "token": "3860b033229de1ae77...",
     *       "masked_pan": "xxxx-xxxx-xxxx-2346",
     *       "card_subtype": "MasterCard",
     *       "card_expired": false
     *     },
     *     "source_data": {
     *       "type": "card",
     *       "pan": "2346",
     *       "sub_type": "MasterCard"
     *     }
     *   }
     * }
     *
     * @param array $callbackData Webhook payload
     * @return array|null ['token', 'last4', 'brand', 'card_subtype'] or null
     */
    public function extractCardTokenFromIntention(array $callbackData): ?array
    {
        // NEW: Check for token object (Intention API)
        if (isset($callbackData['token']['token'])) {
            $tokenObj = $callbackData['token'];
            $sourceData = $callbackData['source_data'] ?? [];

            // Extract last 4 from masked_pan (e.g., "xxxx-xxxx-xxxx-2346")
            $maskedPan = $tokenObj['masked_pan'] ?? null;
            $last4 = $this->extractLast4Digits($maskedPan ?? $sourceData['pan'] ?? null);

            $cardData = [
                'token' => $tokenObj['token'],  // ⭐ Stable Paymob saved card token
                'last4' => $last4,
                'brand' => $this->normalizeCardBrand($sourceData['sub_type'] ?? $tokenObj['card_subtype'] ?? 'other'),
                'card_subtype' => $tokenObj['card_subtype'] ?? null, // MasterCard/Visa/etc
                'card_expired' => $tokenObj['card_expired'] ?? false,
            ];

            Log::info('✅ Card token extracted from Intention webhook', [
                'last4' => $cardData['last4'],
                'brand' => $cardData['brand'],
            ]);

            return $cardData;
        }

        // NEW: Check for direct token (from our custom token webhook handler)
        if (isset($callbackData['token']) && is_string($callbackData['token'])) {
            $sourceData = $callbackData['source_data'] ?? [];
            $maskedPan = $callbackData['masked_pan'] ?? null;
            $last4 = $this->extractLast4Digits($maskedPan ?? $sourceData['pan'] ?? null);

            $cardData = [
                'token' => $callbackData['token'],
                'last4' => $last4,
                'brand' => $this->normalizeCardBrand($sourceData['sub_type'] ?? 'other'),
            ];

            Log::info('✅ Card token extracted from direct structure', [
                'last4' => $cardData['last4'],
                'brand' => $cardData['brand'],
            ]);

            return $cardData;
        }

        // LEGACY: Fallback to old extractCardTokenFromCallback() for classic flow
        // This will return null for classic iframe flow (no tokenization)
        return $this->extractCardTokenFromCallback($callbackData);
    }

    /**
     * Fetch transaction details from Paymob API
     * Used for manual status verification when webhooks don't arrive
     *
     * @param string $intentionId Paymob intention ID (pi_test_xxx)
     * @return array|null Transaction data or null if not found
     */
    public function getTransactionByIntention(string $intentionId): ?array
    {
        try {
            // Paymob uses Transaction API to retrieve payment details
            // We need to get the transactions list and filter by intention ID
            // Alternative: Use the intention details endpoint
            $endpoint = "https://accept.paymob.com/v1/intentions/{$intentionId}";

            $response = Http::timeout(30)
                ->retry(2, 1000)
                ->withHeaders([
                    'Authorization' => 'Token ' . $this->secretKey,
                    'Content-Type' => 'application/json',
                ])
                ->get($endpoint);

            if (!$response->successful()) {
                Log::error('❌ Failed to fetch transaction from Paymob', [
                    'intention_id' => $intentionId,
                    'status' => $response->status(),
                    'error' => $response->body(),
                ]);
                return null;
            }

            $data = $response->json();

            Log::info('✅ Transaction retrieved from Paymob', [
                'intention_id' => $intentionId,
                'status' => $data['status'] ?? 'unknown',
                'transaction_id' => $data['latest_transaction']['id'] ?? null,
            ]);

            return $data;

        } catch (Exception $e) {
            Log::error('❌ Exception fetching transaction', [
                'intention_id' => $intentionId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}

