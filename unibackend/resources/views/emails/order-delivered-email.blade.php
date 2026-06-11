<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Order Delivered | {{ config('app.name') }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

@php
$appName = config('app.name', 'Elbaraka');
$customer = $order->user;
$items = $order->items;
$deliveredAt = $order->updated_at ?? $order->created_at;
@endphp

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- ── HEADER ── -->
        <tr>
          <td style="background:linear-gradient(135deg,#14532d 0%,#166534 60%,#15803d 100%);border-radius:16px 16px 0 0;padding:40px 40px 36px;text-align:center;">
            <div style="font-size:52px;margin-bottom:12px;">🎉</div>
            <div style="font-size:26px;font-weight:800;color:#ffffff;margin-bottom:8px;letter-spacing:0.5px;">Order Delivered!</div>
            <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Your order has arrived. We hope you love it!</p>
            <div style="margin-top:14px;background:rgba(255,255,255,0.15);display:inline-block;border-radius:50px;padding:8px 24px;">
              <span style="color:#ffffff;font-size:14px;font-weight:700;">🛒 {{ $appName }}</span>
            </div>
          </td>
        </tr>

        <!-- ── BODY ── -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;">

            <p style="font-size:17px;color:#111827;font-weight:600;margin:0 0 6px;">Hi {{ $customer->name ?? 'Valued Customer' }},</p>
            <p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.7;">
              Your order <strong style="color:#166534;">#{{ $order->order_number }}</strong> has been successfully delivered on 
              <strong style="color:#111827;">{{ $deliveredAt->format('l, M d, Y \a\t h:i A') }}</strong>.
              We hope your experience was excellent!
            </p>

            <!-- Order Delivered Summary Box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:22px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:top;width:50%;">
                        <p style="font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;font-weight:700;">Order Number</p>
                        <p style="font-size:22px;color:#14532d;font-weight:800;margin:0;">#{{ $order->order_number }}</p>
                      </td>
                      <td style="vertical-align:top;text-align:right;width:50%;">
                        <p style="font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;font-weight:700;">Delivered</p>
                        <p style="font-size:14px;color:#374151;font-weight:600;margin:0;">{{ $deliveredAt->format('M d, Y') }}</p>
                        <p style="font-size:12px;color:#6b7280;margin:2px 0 0;">{{ $deliveredAt->format('h:i A') }}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Delivered Items -->
            <p style="font-size:15px;font-weight:700;color:#111827;margin:0 0 14px;border-bottom:2px solid #f3f4f6;padding-bottom:10px;">Items Delivered</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              @foreach($items as $item)
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:12px 0;vertical-align:middle;">
                  <p style="font-size:14px;color:#111827;font-weight:600;margin:0 0 2px;">{{ $item->product_name }}</p>
                  @if($item->product_sku && $item->product_sku !== '-')
                  <p style="font-size:11px;color:#9ca3af;margin:0;">SKU: {{ $item->product_sku }}</p>
                  @endif
                </td>
                <td style="padding:12px 8px;text-align:center;vertical-align:middle;">
                  <span style="font-size:13px;color:#6b7280;">x{{ $item->quantity }}</span>
                </td>
                <td style="padding:12px 0;text-align:right;vertical-align:middle;white-space:nowrap;">
                  <span style="font-size:14px;color:#374151;font-weight:600;">{{ number_format($item->subtotal, 2) }} EGP</span>
                </td>
              </tr>
              @endforeach
              <tr>
                <td colspan="2" style="padding:14px 0 4px;font-size:15px;font-weight:800;color:#111827;border-top:2px solid #166534;">Order Total</td>
                <td style="padding:14px 0 4px;text-align:right;font-size:15px;font-weight:800;color:#166534;border-top:2px solid #166534;white-space:nowrap;">{{ number_format($order->total, 2) }} EGP</td>
              </tr>
            </table>

            <!-- Review CTA -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fffbeb,#fef9c3);border:1px solid #fde68a;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:22px 24px;text-align:center;">
                  <p style="font-size:22px;margin:0 0 8px;">⭐️⭐️⭐️⭐️⭐️</p>
                  <p style="font-size:16px;font-weight:700;color:#92400e;margin:0 0 6px;">How was your experience?</p>
                  <p style="font-size:13px;color:#78350f;margin:0 0 16px;line-height:1.6;">Your feedback helps us improve. Open the app to rate your items and delivery driver!</p>
                  <p style="font-size:12px;color:#92400e;font-weight:600;margin:0;">📱 Open the {{ $appName }} app → My Orders → Rate this order</p>
                </td>
              </tr>
            </table>

            <!-- Invoice Note -->
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
              <p style="font-size:13px;color:#0369a1;margin:0;">
                📄 Need an invoice? Open the app → My Orders → <strong>Email me Invoice</strong>
              </p>
            </div>

            <p style="font-size:13px;color:#6b7280;margin:20px 0 0;line-height:1.6;">
              Had an issue with your delivery? Contact us at 
              <a href="mailto:support@elbaraka.com" style="color:#166534;font-weight:600;text-decoration:none;">support@elbaraka.com</a> and we'll make it right.
            </p>

          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
            <p style="font-size:13px;font-weight:700;color:#166534;margin:0 0 6px;">Thank you for choosing {{ $appName }}! 💚</p>
            <p style="font-size:12px;color:#9ca3af;margin:0;">We look forward to serving you again soon.</p>
            <p style="font-size:11px;color:#d1d5db;margin:10px 0 0;">&copy; {{ date('Y') }} {{ $appName }}. All rights reserved. · Cairo, Egypt</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
