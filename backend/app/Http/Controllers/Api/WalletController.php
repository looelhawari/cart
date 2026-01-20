<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserWallet;
use App\Models\PaymobPayment;
use App\Services\PaymobService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Exception;

class WalletController extends Controller
{
    private PaymobService $paymobService;

    public function __construct(PaymobService $paymobService)
    {
        $this->paymobService = $paymobService;
    }

    /**
     * Get wallet balance and recent transactions
     * GET /api/v1/wallet
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            // Get or create wallet
            $wallet = UserWallet::firstOrCreate(
                ['user_id' => $user->id],
                ['balance' => 0, 'total_credited' => 0, 'total_debited' => 0]
            );

            // Get recent transactions
            $transactions = $wallet->transactions()
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'balance' => (float) $wallet->balance,
                    'total_credited' => (float) $wallet->total_credited,
                    'total_debited' => (float) $wallet->total_debited,
                    'transactions' => $transactions,
                ],
            ]);
        } catch (Exception $e) {
            Log::error('Failed to fetch wallet', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id ?? null,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch wallet',
            ], 500);
        }
    }

    /**
     * Get all wallet transactions with pagination
     * GET /api/v1/wallet/transactions
     */
    public function transactions(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            $wallet = UserWallet::where('user_id', $user->id)->first();

            if (!$wallet) {
                return response()->json([
                    'success' => true,
                    'data' => ['transactions' => []],
                ]);
            }

            $transactions = $wallet->transactions()
                ->orderBy('created_at', 'desc')
                ->paginate(20);

            return response()->json([
                'success' => true,
                'data' => [
                    'transactions' => $transactions->items(),
                    'pagination' => [
                        'current_page' => $transactions->currentPage(),
                        'total_pages' => $transactions->lastPage(),
                        'total' => $transactions->total(),
                        'per_page' => $transactions->perPage(),
                    ],
                ],
            ]);
        } catch (Exception $e) {
            Log::error('Failed to fetch transactions', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch transactions',
            ], 500);
        }
    }

    /**
     * Initiate wallet recharge with Paymob
     * POST /api/v1/wallet/recharge
     */
    public function recharge(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:10|max:10000',
            'payment_method' => 'required|in:CARD,WALLET',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $user = $request->user();
            $amount = (float) $request->amount;
            $paymentMethod = $request->payment_method;

            // Get or create wallet
            $wallet = UserWallet::firstOrCreate(
                ['user_id' => $user->id],
                ['balance' => 0, 'total_credited' => 0, 'total_debited' => 0]
            );

            // Convert amount to cents
            $amountCents = (int) ($amount * 100);

            // Generate unique internal reference
            $internalOrderId = 'WALLET-' . $user->id . '-' . time();

            // Step 1: Authenticate with Paymob
            $authToken = $this->paymobService->authenticate();

            // Step 2: Register order with Paymob
            $paymobOrderId = $this->paymobService->registerOrder(
                $authToken,
                $amountCents,
                $internalOrderId
            );

            // Prepare billing data
            $billingData = [
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone_number' => $user->phone,
                'apartment' => 'NA',
                'floor' => 'NA',
                'building' => 'NA',
                'street' => 'NA',
                'city' => 'Cairo',
                'country' => 'Egypt',
                'state' => 'Cairo',
                'postal_code' => 'NA',
                'shipping_method' => 'NA',
            ];

            // Step 3: Generate payment key
            $paymentToken = $this->paymobService->generatePaymentKey(
                $authToken,
                $amountCents,
                $paymobOrderId,
                $billingData,
                $paymentMethod
            );

            // Get integration ID
            $integrationId = $this->paymobService->getIntegrationId($paymentMethod);

            // Don't store in paymob_payments - that's only for orders
            // Wallet recharge will be tracked via wallet_transactions when callback arrives

            DB::commit();

            // Get iframe URL
            $iframeUrl = $this->paymobService->getIframeUrl($paymentToken);

            return response()->json([
                'success' => true,
                'data' => [
                    'internal_order_id' => $internalOrderId,
                    'paymob_order_id' => $paymobOrderId,
                    'payment_token' => $paymentToken,
                    'iframe_url' => $iframeUrl,
                    'amount' => $amount,
                    'currency' => 'EGP',
                ],
            ]);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Wallet recharge failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate wallet recharge. Please try again.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle Paymob callback for wallet recharge
     * This is called by PaymentController after verifying the webhook
     */
    public function handleRechargeCallback(PaymobPayment $payment): void
    {
        try {
            // Extract wallet ID from internal_order_id
            // Format: WALLET-{user_id}-{timestamp}
            $parts = explode('-', $payment->internal_order_id);
            if (count($parts) !== 3 || $parts[0] !== 'WALLET') {
                Log::error('Invalid wallet recharge reference', [
                    'internal_order_id' => $payment->internal_order_id,
                ]);
                return;
            }

            $userId = (int) $parts[1];

            // Get wallet
            $wallet = UserWallet::where('user_id', $userId)->first();

            if (!$wallet) {
                Log::error('Wallet not found for recharge', [
                    'user_id' => $userId,
                ]);
                return;
            }

            // Credit the wallet
            $amount = $payment->amount_cents / 100;
            $wallet->credit(
                $amount,
                'Wallet recharge via ' . $payment->payment_method,
                'PaymobPayment',
                $payment->id
            );

            Log::info('Wallet recharged successfully', [
                'wallet_id' => $wallet->id,
                'amount' => $amount,
                'payment_id' => $payment->id,
            ]);

        } catch (Exception $e) {
            Log::error('Failed to process wallet recharge callback', [
                'error' => $e->getMessage(),
                'payment_id' => $payment->id,
            ]);
        }
    }
}
