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
        'name'        => 'CART',
        'legal_name'  => 'CART',
        'address'     => 'Cairo, Egypt',
        'phone'       => '+20 123 456 7890',
        'email'       => 'support@elbaraka.com',
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
            'card_on_delivery'        => 'Card Machine on Delivery',
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
            'tax_rate'    => 0, // Tax removed from system
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
     * @param string $format 'a4' (default, email-friendly A4 portrait) or
     *                       'thermal80' (80mm x 80mm thermal receipt, e.g.
     *                       BIXOLON ELLIX35 thermal POS printers).
     *
     * Thermal mode (Wave 5 — Task 6 partial):
     *   - Paper is set to 80mm x 80mm via setPaper([0,0,226.77,226.77]).
     *     dompdf uses PostScript points: 1mm = 2.83465pt, so 80mm = 226.77pt.
     *   - Uses a dedicated `invoices.order-invoice-thermal` blade designed
     *     for narrow paper: single-column, compact spacing, no flex/grid,
     *     no gradients or emojis (dompdf without an emoji font drops them).
     *   - Renders RTL with DejaVu Sans (dompdf built-in, has full Arabic
     *     glyph coverage) when the order's customer is on `ar` locale.
     *     Output quality is utilitarian, not beautiful — for full Arabic
     *     typography polish we'd ship Cairo/Tajawal TTFs (separate task).
     */
    public function generatePdf(Order $order, string $format = 'a4'): ?string
    {
        $data = $this->buildInvoiceData($order);
        // Locale derivation: prefer the order's customer language, fall back
        // to the app's current locale.
        $locale = strtolower((string) ($order->user->language ?? app()->getLocale() ?? 'en'));
        if (! in_array($locale, ['en', 'ar'], true)) {
            $locale = 'en';
        }
        $data['locale'] = $locale;
        $data['dir']    = $locale === 'ar' ? 'rtl' : 'ltr';

        try {
            if (! class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
                Log::warning('[InvoiceService] barryvdh/laravel-dompdf not installed – falling back to HTML.');
                return null;
            }

            if ($format === 'thermal80') {
                // 80mm × 80mm — ELLIX35 paper size shown in Chrome's print dialog.
                // 80mm in PostScript points = 80 * (72/25.4) = 226.77.
                $pt = static fn (float $mm): float => $mm * 2.83464566929;
                $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('invoices.order-invoice-thermal', $data)
                    ->setPaper([0, 0, $pt(80), $pt(80)], 'portrait');
                return $pdf->output();
            }

            // Default A4 portrait — email-attached invoices, customer downloads.
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('invoices.order-invoice', $data)
                ->setPaper('a4', 'portrait');
            return $pdf->output();
        } catch (\Throwable $e) {
            Log::error('[InvoiceService] PDF generation failed', [
                'order_id' => $order->id,
                'format'   => $format,
                'error'    => $e->getMessage(),
            ]);
            return null;
        }
    }
}
