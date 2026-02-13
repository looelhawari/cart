<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderRefund;
use Illuminate\Support\Facades\Log;

class InvoiceService
{
    /**
     * Store info — hardcoded for now, can be moved to a settings table later.
     */
    private const STORE = [
        'name'        => 'ElBaraka Hypermarket',
        'legal_name'  => 'ElBaraka Hypermarket Co.',
        'address'     => 'Cairo, Egypt',
        'phone'       => '+20 123 456 7890',
        'email'       => 'support@elbaraka.com',
        'vat_reg'     => '123-456-789',   // Placeholder — replace with real VAT registration
        'tax_rate'    => 14,              // Egyptian VAT rate %
    ];

    /**
     * Build a structured data array for the invoice (used by both
     * the PDF Blade template and the JSON endpoint for in-app receipt).
     */
    public function buildInvoiceData(Order $order): array
    {
        // Ensure relations are loaded
        $order->loadMissing(['items.product', 'user', 'deliveryAddress', 'refunds']);

        // Lazy-generate invoice number
        $invoiceNumber = $order->getOrCreateInvoiceNumber();

        // ---------- Items ----------
        $items = [];
        foreach ($order->items as $item) {
            $items[] = [
                'name'       => $item->product_name,
                'sku'        => $item->product_sku ?? '-',
                'quantity'   => (int) $item->quantity,
                'unit_price' => number_format((float) $item->price, 2, '.', ''),
                'subtotal'   => number_format((float) $item->subtotal, 2, '.', ''),
                'refunded'   => (bool) $item->refunded,
            ];
        }

        // ---------- Refunds ----------
        $refunds = [];
        $totalRefunded = 0;
        if ($order->refunds && $order->refunds->count() > 0) {
            foreach ($order->refunds as $refund) {
                $refunds[] = [
                    'id'               => $refund->id,
                    'type'             => $refund->type,           // full | partial | penalty
                    'original_amount'  => number_format((float) $refund->original_amount, 2, '.', ''),
                    'penalty_percent'  => (float) $refund->penalty_percent,
                    'penalty_amount'   => number_format((float) $refund->penalty_amount, 2, '.', ''),
                    'refund_amount'    => number_format((float) $refund->refund_amount, 2, '.', ''),
                    'refund_method'    => $refund->refund_method,
                    'status'           => $refund->status,
                    'reason'           => $refund->reason,
                    'refunded_items'   => $refund->refunded_items ?? [],
                    'created_at'       => $refund->created_at->toIso8601String(),
                ];
                if ($refund->status === 'completed') {
                    $totalRefunded += (float) $refund->refund_amount;
                }
            }
        }

        // ---------- Payment label ----------
        $paymentLabel = match ($order->payment_method) {
            'cod', 'cash_on_delivery' => 'Cash on Delivery',
            'card'                    => 'Card Payment',
            default                   => ucfirst(str_replace('_', ' ', $order->payment_method)),
        };

        // ---------- Delivery address ----------
        $address = null;
        $addrSource = $order->delivery_address_snapshot ?? ($order->deliveryAddress ? $order->deliveryAddress->toArray() : null);
        if ($addrSource) {
            $address = [
                'label'     => $addrSource['label'] ?? 'Home',
                'street'    => $addrSource['street'] ?? '',
                'building'  => $addrSource['building'] ?? null,
                'floor'     => $addrSource['floor'] ?? null,
                'apartment' => $addrSource['apartment'] ?? null,
                'city'      => $addrSource['city'] ?? '',
                'area'      => $addrSource['area'] ?? null,
                'landmark'  => $addrSource['landmark'] ?? null,
            ];
        }

        // ---------- Promo ----------
        $promo = null;
        if ($order->promo_code_snapshot) {
            $promo = $order->promo_code_snapshot;
        }

        // ---------- Net paid ----------
        $netPaid = max(0, (float) $order->total - $totalRefunded);

        return [
            'store'          => self::STORE,
            'invoice_number' => $invoiceNumber,
            'order_number'   => $order->order_number,
            'order_id'       => $order->id,
            'order_date'     => $order->created_at->format('M d, Y h:i A'),
            'status'         => $order->status,
            'status_label'   => $order->status_label,

            'customer' => [
                'name'  => $order->user->name ?? 'Customer',
                'email' => $order->user->email ?? null,
                'phone' => $order->user->phone ?? null,
            ],

            'delivery_address' => $address,
            'delivery_date'    => $order->delivery_date?->format('M d, Y'),
            'delivery_slot'    => $order->delivery_time_slot,

            'items'       => $items,
            'subtotal'    => number_format((float) $order->subtotal, 2, '.', ''),
            'delivery_fee'=> number_format((float) $order->delivery_fee, 2, '.', ''),
            'tax'         => number_format((float) $order->tax, 2, '.', ''),
            'tax_rate'    => self::STORE['tax_rate'],
            'discount'    => number_format((float) $order->discount, 2, '.', ''),
            'promo'       => $promo,
            'total'       => number_format((float) $order->total, 2, '.', ''),

            'payment_method' => $order->payment_method,
            'payment_label'  => $paymentLabel,
            'payment_status' => $order->payment_status,

            'refunds'         => $refunds,
            'total_refunded'  => number_format($totalRefunded, 2, '.', ''),
            'net_paid'        => number_format($netPaid, 2, '.', ''),

            'cancelled_at'       => $order->cancelled_at?->format('M d, Y h:i A'),
            'cancellation_reason'=> $order->cancellation_reason,

            'generated_at' => now()->format('M d, Y h:i A'),
        ];
    }

    /**
     * Render the invoice as an HTML string (for the PDF generator).
     */
    public function renderHtml(Order $order): string
    {
        $data = $this->buildInvoiceData($order);

        return view('invoices.order-invoice', $data)->render();
    }

    /**
     * Generate a PDF for the given order and return raw PDF bytes.
     *
     * Uses dompdf via the built-in Laravel helper (no extra package needed
     * if barryvdh/laravel-dompdf is installed, but we also support a
     * plain-HTML download fallback).
     */
    public function generatePdf(Order $order): ?string
    {
        $data = $this->buildInvoiceData($order);

        try {
            // Try barryvdh/laravel-dompdf first (preferred)
            if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
                $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('invoices.order-invoice', $data)
                    ->setPaper('a4', 'portrait');

                return $pdf->output();
            }

            // Fallback: render to HTML (caller can deliver as HTML download)
            Log::warning('[InvoiceService] barryvdh/laravel-dompdf not installed – falling back to HTML.');
            return null;
        } catch (\Throwable $e) {
            Log::error('[InvoiceService] PDF generation failed', [
                'order_id' => $order->id,
                'error'    => $e->getMessage(),
            ]);

            return null;
        }
    }
}
