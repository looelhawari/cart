{{--
  Thermal-receipt invoice (80mm x 80mm) — Wave 5 Task 6 partial.

  Designed for BIXOLON ELLIX35 (and any 80mm thermal POS printer).
  - Paper size set by the caller (InvoiceService::generatePdf with 'thermal80'):
        setPaper([0, 0, 226.77, 226.77])   // 80mm x 80mm in PostScript points
  - dompdf will paginate vertically — receipts longer than 80mm produce
    multiple "pages", which thermal printers feed as one continuous strip.
  - Font: DejaVu Sans (dompdf built-in, has Arabic glyph coverage).
    NO @font-face needed.
  - Layout: pure tables, no flex/grid (dompdf 3 has only partial flex support).
  - Colours: monochrome — thermal printers are black-only.
  - No emojis, gradients, or background images (dompdf drops these silently
    when no emoji font is installed).
--}}
<!DOCTYPE html>
<html lang="{{ $locale ?? 'en' }}" dir="{{ $dir ?? 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <title>Invoice {{ $invoice_number }}</title>
    <style>
        @page {
            margin: 0;
        }
        * {
            box-sizing: border-box;
        }
        html, body {
            margin: 0;
            padding: 0;
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 9pt;
            line-height: 1.35;
            color: #000;
        }
        body {
            padding: 3mm 3mm;       /* ~8.5pt printer-safe margin all sides */
            width: 80mm;
        }
        .center { text-align: center; }
        .right  { text-align: right; }
        .bold   { font-weight: bold; }
        .small  { font-size: 7.5pt; }
        .xs     { font-size: 7pt; }
        .strike { text-decoration: line-through; }

        .hr {
            border: 0;
            border-top: 1px dashed #000;
            margin: 1.5mm 0;
        }
        .hr-solid {
            border: 0;
            border-top: 1px solid #000;
            margin: 1.5mm 0;
        }

        h1.brand {
            font-size: 13pt;
            font-weight: bold;
            margin: 0 0 1mm 0;
            text-align: center;
            letter-spacing: 0.5pt;
        }
        .meta-line {
            text-align: center;
            font-size: 7.5pt;
            margin: 0 0 0.5mm 0;
        }

        table.kv,
        table.items,
        table.totals {
            width: 100%;
            border-collapse: collapse;
        }
        table.kv td {
            padding: 0.4mm 0;
            vertical-align: top;
        }
        table.kv td.label {
            color: #000;
            white-space: nowrap;
        }
        /* RTL: in dir=rtl the first cell is naturally right-side; we keep
           td defaults — dompdf flips text-align based on the html dir. */

        table.items th,
        table.items td {
            padding: 0.6mm 0;
            vertical-align: top;
            font-size: 8pt;
        }
        table.items th {
            border-bottom: 1px solid #000;
            font-weight: bold;
        }
        table.items td.qty   { width: 9mm; text-align: center; }
        table.items td.price { width: 17mm; text-align: right; }
        /* Mirror price column for RTL via explicit class — dompdf doesn't
           swap text-align automatically for table cells with explicit values. */
        html[dir="rtl"] table.items td.price { text-align: left; }
        html[dir="rtl"] table.items td.qty   { text-align: center; }

        .item-name {
            font-weight: bold;
            font-size: 8.5pt;
            line-height: 1.25;
            padding-bottom: 0.3mm;
        }
        .item-sub {
            font-size: 7pt;
            color: #000;
            line-height: 1.2;
        }
        .item-refunded {
            font-size: 7pt;
            border: 1px solid #000;
            padding: 0 1mm;
            display: inline-block;
        }

        table.totals td {
            padding: 0.45mm 0;
            font-size: 9pt;
        }
        table.totals td.amount {
            text-align: right;
        }
        html[dir="rtl"] table.totals td.amount {
            text-align: left;
        }
        table.totals tr.grand td {
            font-size: 11pt;
            font-weight: bold;
            padding-top: 1.5mm;
            border-top: 2px solid #000;
        }

        .footer-note {
            font-size: 7.5pt;
            text-align: center;
            margin-top: 2mm;
            line-height: 1.3;
        }

        .badge {
            display: inline-block;
            border: 1px solid #000;
            padding: 0.3mm 1.4mm;
            font-size: 7.5pt;
            font-weight: bold;
        }
    </style>
</head>
<body>

    {{-- ── Brand header ─────────────────────────────────────────── --}}
    <h1 class="brand">{{ $store['name'] ?? 'CART' }}</h1>
    @if (!empty($store['phone']))
        <p class="meta-line">{{ $store['phone'] }}</p>
    @endif
    @if (!empty($store['address']))
        <p class="meta-line">{{ $store['address'] }}</p>
    @endif

    <hr class="hr-solid">

    {{-- ── Order header ─────────────────────────────────────────── --}}
    <table class="kv">
        <tr>
            <td class="label">{{ ($locale ?? 'en') === 'ar' ? 'الفاتورة' : 'Invoice' }}</td>
            <td class="right bold">{{ $invoice_number }}</td>
        </tr>
        <tr>
            <td class="label">{{ ($locale ?? 'en') === 'ar' ? 'رقم الطلب' : 'Order' }}</td>
            <td class="right bold">{{ $order_number }}</td>
        </tr>
        <tr>
            <td class="label">{{ ($locale ?? 'en') === 'ar' ? 'التاريخ' : 'Date' }}</td>
            <td class="right">{{ $order_date }}</td>
        </tr>
        <tr>
            <td class="label">{{ ($locale ?? 'en') === 'ar' ? 'الحالة' : 'Status' }}</td>
            <td class="right">
                <span class="badge">{{ $status_label ?? $status }}</span>
            </td>
        </tr>
        @if (!empty($delivery_date) || !empty($delivery_slot))
            <tr>
                <td class="label">{{ ($locale ?? 'en') === 'ar' ? 'موعد التسليم' : 'Delivery' }}</td>
                <td class="right small">
                    {{ trim(($delivery_date ?? '') . ' ' . ($delivery_slot ?? '')) }}
                </td>
            </tr>
        @endif
    </table>

    <hr class="hr">

    {{-- ── Customer ─────────────────────────────────────────────── --}}
    <table class="kv">
        <tr>
            <td class="label bold">{{ ($locale ?? 'en') === 'ar' ? 'العميل' : 'Customer' }}</td>
            <td></td>
        </tr>
        <tr>
            <td colspan="2">{{ $customer['name'] ?? '-' }}</td>
        </tr>
        @if (!empty($customer['phone']))
            <tr><td colspan="2" class="small">{{ $customer['phone'] }}</td></tr>
        @endif
    </table>

    @if (!empty($delivery_address))
        <table class="kv">
            <tr>
                <td class="label bold">{{ ($locale ?? 'en') === 'ar' ? 'العنوان' : 'Address' }}</td>
                <td></td>
            </tr>
            <tr>
                <td colspan="2" class="small">
                    @php
                        $parts = array_filter([
                            $delivery_address['street']   ?? null,
                            $delivery_address['building'] ?? null,
                            $delivery_address['floor']    ?? null,
                            $delivery_address['apartment']?? null,
                            $delivery_address['area']     ?? null,
                            $delivery_address['city']     ?? null,
                        ]);
                    @endphp
                    {{ implode(' - ', $parts) }}
                    @if (!empty($delivery_address['landmark']))
                        <br>
                        <span class="xs">
                            {{ ($locale ?? 'en') === 'ar' ? 'علامة مميزة:' : 'Landmark:' }}
                            {{ $delivery_address['landmark'] }}
                        </span>
                    @endif
                </td>
            </tr>
        </table>
    @endif

    <hr class="hr">

    {{-- ── Items ────────────────────────────────────────────────── --}}
    <table class="items">
        <thead>
            <tr>
                <th>{{ ($locale ?? 'en') === 'ar' ? 'الصنف' : 'Item' }}</th>
                <th class="qty">{{ ($locale ?? 'en') === 'ar' ? 'كمية' : 'Qty' }}</th>
                <th class="price">{{ ($locale ?? 'en') === 'ar' ? 'المبلغ' : 'Amount' }}</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($items as $item)
                <tr>
                    <td>
                        <div class="item-name {{ $item['refunded'] ? 'strike' : '' }}">
                            {{ $item['name'] }}
                        </div>
                        <div class="item-sub">
                            {{ ($locale ?? 'en') === 'ar' ? 'سعر الوحدة:' : 'Unit:' }}
                            {{ $item['unit_price'] }}
                        </div>
                        @if ($item['refunded'])
                            <span class="item-refunded">
                                {{ ($locale ?? 'en') === 'ar' ? 'مسترد' : 'REFUNDED' }}
                            </span>
                        @endif
                    </td>
                    <td class="qty {{ $item['refunded'] ? 'strike' : '' }}">{{ $item['quantity'] }}</td>
                    <td class="price {{ $item['refunded'] ? 'strike' : '' }}">{{ $item['subtotal'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <hr class="hr">

    {{-- ── Totals ───────────────────────────────────────────────── --}}
    @php
        $currency = ($locale ?? 'en') === 'ar' ? 'ج.م' : 'EGP';
    @endphp
    <table class="totals">
        <tr>
            <td>{{ ($locale ?? 'en') === 'ar' ? 'المجموع الفرعي' : 'Subtotal' }}</td>
            <td class="amount">{{ $subtotal }} {{ $currency }}</td>
        </tr>
        @if ((float) $discount > 0)
            <tr>
                <td>{{ ($locale ?? 'en') === 'ar' ? 'الخصم' : 'Discount' }}{{ !empty($promo['promo_code']) ? ' (' . $promo['promo_code'] . ')' : '' }}</td>
                <td class="amount">- {{ $discount }} {{ $currency }}</td>
            </tr>
        @endif
        <tr>
            <td>{{ ($locale ?? 'en') === 'ar' ? 'رسوم التوصيل' : 'Delivery' }}</td>
            <td class="amount">{{ $delivery_fee }} {{ $currency }}</td>
        </tr>
        @if ((float) $tax > 0)
            <tr>
                <td>{{ ($locale ?? 'en') === 'ar' ? 'الضريبة' : 'Tax' }}</td>
                <td class="amount">{{ $tax }} {{ $currency }}</td>
            </tr>
        @endif
        <tr class="grand">
            <td>{{ ($locale ?? 'en') === 'ar' ? 'الإجمالي' : 'TOTAL' }}</td>
            <td class="amount">{{ $total }} {{ $currency }}</td>
        </tr>
    </table>

    <hr class="hr">

    {{-- ── Payment + refunds ────────────────────────────────────── --}}
    <table class="kv">
        <tr>
            <td class="label">{{ ($locale ?? 'en') === 'ar' ? 'طريقة الدفع' : 'Payment' }}</td>
            <td class="right small">{{ $payment_label }}</td>
        </tr>
        <tr>
            <td class="label">{{ ($locale ?? 'en') === 'ar' ? 'حالة الدفع' : 'Status' }}</td>
            <td class="right small">
                <span class="badge">{{ strtoupper($payment_status) }}</span>
            </td>
        </tr>
    </table>

    @if (!empty($refunds) && (float) $total_refunded > 0)
        <hr class="hr">
        <table class="totals">
            <tr>
                <td>{{ ($locale ?? 'en') === 'ar' ? 'إجمالي المسترد' : 'Total refunded' }}</td>
                <td class="amount">- {{ $total_refunded }} {{ $currency }}</td>
            </tr>
            <tr class="grand">
                <td>{{ ($locale ?? 'en') === 'ar' ? 'صافي المدفوع' : 'Net paid' }}</td>
                <td class="amount">{{ $net_paid }} {{ $currency }}</td>
            </tr>
        </table>
    @endif

    <hr class="hr-solid">

    <p class="footer-note">
        @if (($locale ?? 'en') === 'ar')
            شكرا لتسوقك معنا<br>
            <span class="xs">{{ $generated_at }}</span>
        @else
            Thank you for your order<br>
            <span class="xs">{{ $generated_at }}</span>
        @endif
    </p>

</body>
</html>
