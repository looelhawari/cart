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
                    'message' => __('wallet.unauthenticated'),
                ], 401);
            }

            // Get or create wallet (balance computed from ledger)
            $wallet = UserWallet::firstOrCreate(
                ['user_id' => $user->id]
            );

            // Get recent transactions
            $transactions = $wallet->transactions()
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get()
                ->map(function ($transaction) {
                    return [
                        'id' => $transaction->id,
                        'type' => $transaction->type,
                        'amount' => (float) $transaction->amount,
                        'balance_before' => (float) $transaction->balance_before,
                        'balance_after' => (float) $transaction->balance_after,
                        'description' => $transaction->description,
                        'reference_type' => $transaction->reference_type,
                        'reference_id' => $transaction->reference_id,
                        'created_at' => $transaction->created_at->toIso8601String(),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'balance' => $wallet->balance,
                    'total_credited' => $wallet->total_credited,
                    'total_debited' => $wallet->total_debited,
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
                'message' => __('wallet.fetch_failed'),
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
                    'message' => __('wallet.unauthenticated'),
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
                'message' => __('wallet.transactions_fetch_failed'),
            ], 500);
        }
    }

    // REMOVED: recharge() method - Spec forbids direct wallet top-ups via payment gateway
    // REMOVED: handleRechargeCallback() method - Users can only receive wallet credits via order refunds
}

