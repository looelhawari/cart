<?php

namespace App\Http\Controllers\Api;

use Illuminate\Support\Facades\Log;
use App\Models\PaymobPayment;

/**
 * This is a helper method to handle token webhooks.
 * It should be placed in PaymentController.php
 */
trait PaymentControllerTokenHandler
{
    /**
     * Handle Paymob token webhook (separate from transaction webhook)
     * 
     * Paymob Unified Checkout sends TWO webhooks:
     * 1. Token webhook (arrives first, ~30s before transaction)
     * 2. Transaction webhook (arrives second, confirms payment)
     * 
     * Token webhooks have DIFFERENT HMAC calculation, so we skip HMAC for them.
     */
    protected function handleTokenWebhook(array $payload)
    {
        Log::info('💳 Token webhook received', [
            'token_preview' => substr($payload['token'], 0, 10) . '...',
            'masked_pan' => $payload['masked_pan'],
            'card_subtype' => $payload['card_subtype'] ?? null,
            'merchant_id' => $payload['merchant_id'] ?? null,
            'order_id' => $payload['order_id'] ?? null,
            'email' => $payload['email'] ?? null,
        ]);

        // Find payment - try multiple strategies
        $payment = null;
        
        // STRATEGY 1: Search by paymob_order_id (most reliable for Unified Checkout)
        if (isset($payload['order_id'])) {
            $payment = PaymobPayment::where('paymob_order_id', $payload['order_id'])->first();
            
            Log::info('🔍 Searching by paymob_order_id', [
                'order_id' => $payload['order_id'],
                'found' => $payment ? true : false,
            ]);
        }
        
        // STRATEGY 2: If merchant_id matches internal_order_id pattern
        if (!$payment && isset($payload['merchant_id'])) {
            $merchantId = (string) $payload['merchant_id'];
            
            // Try exact match
            $payment = PaymobPayment::where('internal_order_id', $merchantId)->first();
            
            // Fallback: partial match (in case of truncation)
            if (!$payment) {
                $payment = PaymobPayment::where('internal_order_id', 'LIKE', $merchantId . '%')->first();
            }
            
            Log::info('🔍 Searching by merchant_id', [
                'merchant_id' => $merchantId,
                'found' => $payment ? true : false,
            ]);
        }

        if (!$payment) {
            Log::warning('⚠️ Token webhook: Payment not found', [
                'merchant_id' => $payload['merchant_id'] ?? null,
                'order_id' => $payload['order_id'] ?? null,
                'strategies_tried' => ['paymob_order_id', 'merchant_id'],
            ]);
            
            // Return 200 (not 404) to prevent Paymob retries
            return response()->json(['message' => 'Payment not found, will retry on transaction webhook'], 200);
        }

        if (!$payment->save_card_requested) {
            Log::info('ℹ️ Token webhook: Card save not requested', [
                'payment_id' => $payment->id,
            ]);
            return response()->json(['message' => 'Card save not requested'], 200);
        }

        $order = $payment->order;
        
        if (!$order) {
            Log::error('❌ Token webhook: Order not found for payment', [
                'payment_id' => $payment->id,
            ]);
            return response()->json(['message' => 'Order not found'], 404);
        }
        
        // Create card data structure from token webhook
        $cardData = [
            'token' => $payload['token'],
            'source_data' => [
                'pan' => substr($payload['masked_pan'], -4),
                'sub_type' => $payload['card_subtype'] ?? 'other',
            ],
            'masked_pan' => $payload['masked_pan'],
        ];
        
        // Save card token
        $this->saveCardToken($order->user_id, $cardData);
        
        Log::info('✅ Card token saved from token webhook', [
            'payment_id' => $payment->id,
            'user_id' => $order->user_id,
            'card_last4' => substr($payload['masked_pan'], -4),
            'card_brand' => $payload['card_subtype'] ?? 'other',
        ]);

        return response()->json(['message' => 'Token webhook processed successfully'], 200);
    }
}
