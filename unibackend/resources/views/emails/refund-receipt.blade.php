<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Receipt</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1B5E20, #2E7D32); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; }
        .header .order-num { opacity: 0.85; font-size: 14px; margin-top: 6px; }
        .body { padding: 30px; }
        .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
        .badge-full { background: #d4edda; color: #155724; }
        .badge-penalty { background: #fff3cd; color: #856404; }
        .badge-partial { background: #cce5ff; color: #004085; }
        .badge-cod { background: #e2e3e5; color: #383d41; }
        .summary-box { background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #555; }
        .summary-row.total { font-weight: 700; font-size: 16px; color: #1B5E20; border-top: 2px solid #dee2e6; padding-top: 12px; margin-top: 4px; }
        .summary-row .label { color: #666; }
        .summary-row .value { font-weight: 600; color: #333; }
        .summary-row .penalty { color: #dc3545; }
        .summary-row .refund { color: #28a745; font-weight: 700; }
        .info-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 20px; font-size: 13px; color: #2e7d32; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th { background: #f1f1f1; text-align: left; padding: 10px; font-size: 13px; color: #555; }
        .items-table td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; }
        .footer { text-align: center; padding: 20px 30px; background: #fafafa; border-top: 1px solid #eee; }
        .footer p { font-size: 12px; color: #999; margin: 4px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            @if($refundType === 'cod_cancel')
                <h1>📦 Order Cancelled</h1>
            @else
                <h1>💰 Refund Receipt</h1>
            @endif
            <div class="order-num">Order #{{ $order->order_number }}</div>
        </div>

        <div class="body">
            <p class="greeting">Hello {{ $customerName }},</p>

            @if($refundType === 'full')
                <span class="status-badge badge-full">✅ Full Refund Processed</span>
                <p style="font-size:14px; color:#555;">Your full refund has been processed successfully. The amount will be credited back to your card.</p>
            @elseif($refundType === 'penalty')
                <span class="status-badge badge-penalty">⚠️ Refund with Cancellation Fee</span>
                <p style="font-size:14px; color:#555;">Your order was already being prepared. A {{ number_format($penaltyPercent) }}% preparation fee has been deducted from your refund.</p>
            @elseif($refundType === 'partial')
                <span class="status-badge badge-partial">🔄 Partial Refund Processed</span>
                <p style="font-size:14px; color:#555;">A partial refund for specific items has been processed successfully.</p>
            @else
                <span class="status-badge badge-cod">📦 Order Cancelled</span>
                <p style="font-size:14px; color:#555;">Your cash on delivery order has been cancelled. No payment was charged.</p>
            @endif

            @if($refundType !== 'cod_cancel')
                <div class="summary-box">
                    <div class="summary-row">
                        <span class="label">Order Total</span>
                        <span class="value">{{ number_format($order->total, 2) }} EGP</span>
                    </div>
                    @if($penaltyAmount > 0)
                        <div class="summary-row">
                            <span class="label">Cancellation Fee ({{ number_format($penaltyPercent) }}%)</span>
                            <span class="penalty">-{{ number_format($penaltyAmount, 2) }} EGP</span>
                        </div>
                    @endif
                    <div class="summary-row total">
                        <span>Refund Amount</span>
                        <span class="refund">{{ number_format($refundAmount, 2) }} EGP</span>
                    </div>
                </div>

                <div class="info-box">
                    💳 The refund will appear on your card within <strong>5-14 business days</strong>,
                    depending on your bank. Refund ID: <strong>{{ $refund?->paymob_refund_id ?? 'N/A' }}</strong>
                </div>
            @endif

            @if($refund && $refund->refunded_items && count($refund->refunded_items) > 0)
                <h3 style="font-size:15px; color:#333; margin-bottom:10px;">Refunded Items</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($refund->refunded_items as $item)
                            <tr>
                                <td>{{ $item['product_name'] ?? 'Item' }}</td>
                                <td>{{ $item['quantity'] ?? 1 }}</td>
                                <td>{{ number_format($item['amount'] ?? 0, 2) }} EGP</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        </div>

        <div class="footer">
            <p>Thank you for shopping with <strong>ElBaraka Hypermarket</strong></p>
            <p>If you have questions, contact our support team.</p>
            <p style="margin-top:12px;">© {{ date('Y') }} ElBaraka. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
