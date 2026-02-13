<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {{ $invoice_number }}</title>
    <style>
        /* ───── Reset & Base ───── */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            color: #1e293b;
            line-height: 1.5;
            background: #fff;
        }
        .page { max-width: 800px; margin: 0 auto; padding: 32px; }

        /* ───── Header ───── */
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 3px solid #16a34a; padding-bottom: 18px; }
        .header table { width: 100%; }
        .header td { vertical-align: top; }
        .store-name { font-size: 22px; font-weight: 800; color: #16a34a; margin-bottom: 4px; }
        .store-detail { font-size: 11px; color: #64748b; line-height: 1.6; }
        .invoice-title { font-size: 28px; font-weight: 800; color: #16a34a; text-align: right; text-transform: uppercase; letter-spacing: 2px; }
        .invoice-meta { text-align: right; font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.8; }
        .invoice-meta strong { color: #1e293b; }

        /* ───── Info Boxes ───── */
        .info-grid { margin-bottom: 24px; }
        .info-grid table { width: 100%; }
        .info-grid td { vertical-align: top; width: 33.33%; padding: 0 8px; }
        .info-grid td:first-child { padding-left: 0; }
        .info-grid td:last-child { padding-right: 0; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
        .info-box-title { font-size: 10px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .info-box-value { font-size: 12px; color: #334155; line-height: 1.6; }

        /* ───── Status Banner ───── */
        .status-banner { padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 700; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
        .status-delivered  { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .status-cancelled  { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .status-active     { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
        .status-failed     { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        /* ───── Items Table ───── */
        .section-title { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        table.items th { background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
        table.items th:last-child, table.items td:last-child { text-align: right; }
        table.items td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
        table.items tr:last-child td { border-bottom: none; }
        .item-refunded { text-decoration: line-through; color: #94a3b8; }
        .refunded-badge { display: inline-block; background: #fee2e2; color: #dc2626; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }

        /* ───── Summary ───── */
        .summary-section { margin-bottom: 24px; }
        .summary-table { width: 100%; }
        .summary-table td.label-col { width: 70%; }
        .summary-table td.value-col { width: 30%; text-align: right; }
        .summary-row { padding: 4px 0; }
        .summary-row td { padding: 4px 10px; font-size: 12px; color: #475569; }
        .summary-row-discount td { color: #dc2626; }
        .summary-row-refund td { color: #dc2626; font-weight: 600; }
        .summary-divider td { border-top: 1px solid #e2e8f0; padding-top: 8px; }
        .summary-total td { font-size: 16px; font-weight: 800; color: #1e293b; padding: 8px 10px; border-top: 2px solid #16a34a; }
        .summary-net td { font-size: 14px; font-weight: 700; color: #16a34a; padding: 6px 10px; }

        /* ───── Refund History ───── */
        .refund-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
        .refund-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .refund-type { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
        .refund-type-full { background: #fee2e2; color: #dc2626; }
        .refund-type-partial { background: #fef3c7; color: #d97706; }
        .refund-type-penalty { background: #f3e8ff; color: #9333ea; }
        .refund-amount { font-size: 14px; font-weight: 800; color: #16a34a; }
        .refund-detail { font-size: 11px; color: #64748b; }

        /* ───── Promo ───── */
        .promo-badge { display: inline-block; background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; margin-bottom: 4px; }

        /* ───── Cancellation ───── */
        .cancel-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px; }
        .cancel-title { font-size: 12px; font-weight: 700; color: #991b1b; margin-bottom: 4px; }
        .cancel-detail { font-size: 11px; color: #64748b; }

        /* ───── Footer ───── */
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; }
        .footer p { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
        .footer .thank-you { font-size: 14px; font-weight: 700; color: #16a34a; margin-bottom: 8px; }
    </style>
</head>
<body>
<div class="page">
    {{-- ═══════ HEADER ═══════ --}}
    <div class="header">
        <table>
            <tr>
                <td style="width: 60%;">
                    <div class="store-name">{{ $store['name'] }}</div>
                    <div class="store-detail">
                        {{ $store['legal_name'] }}<br>
                        {{ $store['address'] }}<br>
                        {{ $store['phone'] }}<br>
                    </div>
                </td>
                <td style="width: 40%;">
                    <div class="invoice-title">Invoice</div>
                    <div class="invoice-meta">
                        <strong>Invoice #:</strong> {{ $invoice_number }}<br>
                        <strong>Order #:</strong> {{ $order_number }}<br>
                        <strong>Date:</strong> {{ $order_date }}<br>
                        <strong>Generated:</strong> {{ $generated_at }}
                    </div>
                </td>
            </tr>
        </table>
    </div>

    {{-- ═══════ STATUS BANNER ═══════ --}}
    @php
        $statusClass = match($status) {
            'delivered' => 'status-delivered',
            'cancelled', 'failed' => 'status-cancelled',
            default => 'status-active',
        };
    @endphp
    <div class="status-banner {{ $statusClass }}">
        Order Status: {{ $status_label }}
    </div>

    {{-- ═══════ INFO BOXES ═══════ --}}
    <div class="info-grid">
        <table>
            <tr>
                <td>
                    <div class="info-box">
                        <div class="info-box-title">Customer</div>
                        <div class="info-box-value">
                            {{ $customer['name'] }}<br>
                            @if($customer['phone']) {{ $customer['phone'] }}<br> @endif
                            @if($customer['email']) {{ $customer['email'] }} @endif
                        </div>
                    </div>
                </td>
                <td>
                    <div class="info-box">
                        <div class="info-box-title">Delivery Address</div>
                        <div class="info-box-value">
                            @if($delivery_address)
                                {{ $delivery_address['label'] }}<br>
                                {{ $delivery_address['street'] }}<br>
                                @if($delivery_address['building'] || $delivery_address['floor'] || $delivery_address['apartment'])
                                    @if($delivery_address['building']) Bldg {{ $delivery_address['building'] }} @endif
                                    @if($delivery_address['floor']) Floor {{ $delivery_address['floor'] }} @endif
                                    @if($delivery_address['apartment']) Apt {{ $delivery_address['apartment'] }} @endif
                                    <br>
                                @endif
                                {{ $delivery_address['city'] }}{{ $delivery_address['area'] ? ', '.$delivery_address['area'] : '' }}
                            @else
                                N/A
                            @endif
                        </div>
                    </div>
                </td>
                <td>
                    <div class="info-box">
                        <div class="info-box-title">Payment & Delivery</div>
                        <div class="info-box-value">
                            {{ $payment_label }}<br>
                            Status: {{ ucfirst(str_replace('_', ' ', $payment_status)) }}<br>
                            @if($delivery_date) {{ $delivery_date }} @endif
                            @if($delivery_slot) ({{ $delivery_slot }}) @endif
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    {{-- ═══════ CANCELLATION INFO (if applicable) ═══════ --}}
    @if($cancelled_at)
        <div class="cancel-box">
            <div class="cancel-title">⚠ Order Cancelled</div>
            <div class="cancel-detail">
                Cancelled on: {{ $cancelled_at }}<br>
                @if($cancellation_reason) Reason: {{ $cancellation_reason }} @endif
            </div>
        </div>
    @endif

    {{-- ═══════ ITEMS TABLE ═══════ --}}
    <div class="section-title">Order Items</div>
    <table class="items">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 45%;">Item</th>
                <th style="width: 12%;">Qty</th>
                <th style="width: 18%;">Unit Price</th>
                <th style="width: 20%;">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $i => $item)
                <tr>
                    <td class="{{ $item['refunded'] ? 'item-refunded' : '' }}">{{ $i + 1 }}</td>
                    <td>
                        <span class="{{ $item['refunded'] ? 'item-refunded' : '' }}">{{ $item['name'] }}</span>
                        @if($item['refunded'])
                            <span class="refunded-badge">Refunded</span>
                        @endif
                    </td>

                    <td class="{{ $item['refunded'] ? 'item-refunded' : '' }}">{{ $item['quantity'] }}</td>
                    <td class="{{ $item['refunded'] ? 'item-refunded' : '' }}">{{ $item['unit_price'] }} EGP</td>
                    <td class="{{ $item['refunded'] ? 'item-refunded' : '' }}">{{ $item['subtotal'] }} EGP</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- ═══════ PROMO ═══════ --}}
    @if($promo)
        <div style="margin-bottom: 12px;">
            <span class="promo-badge">🏷 Promo Code Applied</span>
        </div>
    @endif

    {{-- ═══════ PRICE SUMMARY ═══════ --}}
    <div class="summary-section">
        <div class="section-title">Price Summary</div>
        <table class="summary-table">
            <tr class="summary-row">
                <td class="label-col">Subtotal</td>
                <td class="value-col">{{ $subtotal }} EGP</td>
            </tr>
            <tr class="summary-row">
                <td class="label-col">Delivery Fee</td>
                <td class="value-col">{{ $delivery_fee == '0.00' ? 'FREE' : $delivery_fee . ' EGP' }}</td>
            </tr>
            <tr class="summary-row">
                <td class="label-col">Tax ({{ $tax_rate }}% VAT)</td>
                <td class="value-col">{{ $tax }} EGP</td>
            </tr>
            @if((float)$discount > 0)
                <tr class="summary-row summary-row-discount">
                    <td class="label-col">Discount</td>
                    <td class="value-col">-{{ $discount }} EGP</td>
                </tr>
            @endif
            <tr class="summary-total">
                <td class="label-col">Total</td>
                <td class="value-col">{{ $total }} EGP</td>
            </tr>
            @if((float)$total_refunded > 0)
                <tr class="summary-row summary-row-refund">
                    <td class="label-col">Total Refunded</td>
                    <td class="value-col">-{{ $total_refunded }} EGP</td>
                </tr>
                <tr class="summary-net">
                    <td class="label-col">Net Paid</td>
                    <td class="value-col">{{ $net_paid }} EGP</td>
                </tr>
            @endif
        </table>
    </div>

    {{-- ═══════ REFUND HISTORY ═══════ --}}
    @if(count($refunds) > 0)
        <div class="section-title">Refund History</div>
        @foreach($refunds as $refund)
            <div class="refund-card">
                <table style="width:100%;">
                    <tr>
                        <td style="vertical-align:top;">
                            @php
                                $refundTypeClass = match($refund['type']) {
                                    'full'    => 'refund-type-full',
                                    'partial' => 'refund-type-partial',
                                    'penalty' => 'refund-type-penalty',
                                    default   => 'refund-type-full',
                                };
                                $typeLabel = match($refund['type']) {
                                    'full'    => 'Full Order',
                                    'partial' => 'Partial Items',
                                    'penalty' => 'With Penalty',
                                    default   => ucfirst($refund['type']),
                                };
                            @endphp
                            <span class="refund-type {{ $refundTypeClass }}">{{ $typeLabel }}</span>
                            <span style="font-size:10px;color:#64748b;margin-left:8px;">{{ ucfirst($refund['status']) }}</span>
                        </td>
                        <td style="text-align:right;vertical-align:top;">
                            <span class="refund-amount">{{ $refund['refund_amount'] }} EGP</span>
                        </td>
                    </tr>
                </table>
                @if((float)$refund['penalty_amount'] > 0)
                    <div class="refund-detail" style="margin-top:4px;">
                        Penalty ({{ $refund['penalty_percent'] }}%): -{{ $refund['penalty_amount'] }} EGP
                    </div>
                @endif
                @if(!empty($refund['refunded_items']))
                    <div class="refund-detail" style="margin-top:4px;">
                        Items:
                        @foreach($refund['refunded_items'] as $ri)
                            {{ $ri['product_name'] ?? 'Item' }} × {{ $ri['quantity'] ?? 1 }}{{ !$loop->last ? ', ' : '' }}
                        @endforeach
                    </div>
                @endif
                @if($refund['reason'])
                    <div class="refund-detail" style="margin-top:2px;">Reason: {{ $refund['reason'] }}</div>
                @endif
                <div class="refund-detail" style="margin-top:2px;">
                    {{ \Carbon\Carbon::parse($refund['created_at'])->format('M d, Y h:i A') }}
                </div>
            </div>
        @endforeach
    @endif

    {{-- ═══════ FOOTER ═══════ --}}
    <div class="footer">
        <p class="thank-you">Thank you for shopping with {{ $store['name'] }}!</p>
        <p>{{ $store['address'] }} · {{ $store['phone'] }} · {{ $store['email'] }}</p>
    </div>
</div>
</body>
</html>
