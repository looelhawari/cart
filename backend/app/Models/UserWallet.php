<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class UserWallet extends Model
{
    protected $fillable = [
        'user_id',
        // Note: balance, total_credited, total_debited are computed from ledger
    ];

    protected $appends = ['balance', 'total_credited', 'total_debited'];

    /**
     * Get the user that owns the wallet
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all transactions for this wallet
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class, 'wallet_id');
    }

    /**
     * Compute current balance from ledger
     * This is the ONLY source of truth for wallet balance
     */
    public function getBalanceAttribute(): float
    {
        return (float) $this->transactions()
            ->selectRaw('SUM(CASE WHEN type = "credit" THEN amount ELSE -amount END) as balance')
            ->value('balance') ?? 0.00;
    }

    /**
     * Compute total credited from ledger
     */
    public function getTotalCreditedAttribute(): float
    {
        return (float) $this->transactions()
            ->where('type', 'credit')
            ->sum('amount') ?? 0.00;
    }

    /**
     * Compute total debited from ledger
     */
    public function getTotalDebitedAttribute(): float
    {
        return (float) $this->transactions()
            ->where('type', 'debit')
            ->sum('amount') ?? 0.00;
    }

    /**
     * Credit wallet (add money) with idempotency
     *
     * @param float $amount
     * @param string $description
     * @param string|null $referenceType
     * @param int|null $referenceId
     * @param string|null $idempotencyKey Unique key to prevent duplicate credits
     * @return WalletTransaction
     * @throws \Exception
     */
    public function credit(
        float $amount,
        string $description,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $idempotencyKey = null
    ): WalletTransaction {
        return DB::transaction(function() use ($amount, $description, $referenceType, $referenceId, $idempotencyKey) {
            // Lock wallet row to prevent race conditions
            DB::table('user_wallets')
                ->where('id', $this->id)
                ->lockForUpdate()
                ->first();

            // Check for duplicate transaction (idempotency)
            if ($idempotencyKey) {
                $existing = $this->transactions()
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($existing) {
                    return $existing; // Return existing transaction, don't duplicate
                }
            }

            // Compute balance before transaction
            $balanceBefore = $this->balance;

            // Create transaction record
            $transaction = $this->transactions()->create([
                'user_id' => $this->user_id,
                'type' => 'credit',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceBefore + $amount,
                'description' => $description,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'idempotency_key' => $idempotencyKey,
            ]);

            return $transaction;
        });
    }

    /**
     * Debit wallet (spend money) with idempotency
     *
     * @param float $amount
     * @param string $description
     * @param string|null $referenceType
     * @param int|null $referenceId
     * @param string|null $idempotencyKey Unique key to prevent duplicate debits
     * @return WalletTransaction
     * @throws \Exception
     */
    public function debit(
        float $amount,
        string $description,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $idempotencyKey = null
    ): WalletTransaction {
        return DB::transaction(function() use ($amount, $description, $referenceType, $referenceId, $idempotencyKey) {
            // Lock wallet row to prevent race conditions
            DB::table('user_wallets')
                ->where('id', $this->id)
                ->lockForUpdate()
                ->first();

            // Check for duplicate transaction (idempotency)
            if ($idempotencyKey) {
                $existing = $this->transactions()
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($existing) {
                    return $existing; // Return existing transaction, don't duplicate
                }
            }

            // Compute current balance
            $balanceBefore = $this->balance;

            // Check sufficient balance
            if ($balanceBefore < $amount) {
                throw new \Exception('Insufficient wallet balance');
            }

            // Create debit transaction
            $transaction = $this->transactions()->create([
                'user_id' => $this->user_id,
                'type' => 'debit',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceBefore - $amount,
                'description' => $description,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'idempotency_key' => $idempotencyKey,
            ]);

            return $transaction;
        });
    }

    /**
     * Check if wallet has sufficient balance
     */
    public function hasSufficientBalance(float $amount): bool
    {
        return $this->balance >= $amount;
    }
}
