<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Order Confirmed | {{ config('app.name') }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

@php
$appName = config('app.name', 'Elbaraka');
$customer = $order->user;
$items = $order->items;
$address = $order->delivery_address_snapshot ?? ($order->deliveryAddress ? $order->deliveryAddress->toArray() : null);
$promo = $order->promo_code_snapshot;
$paymentLabel = match ($order->payment_method) {
    'cod', 'cash_on_delivery' => 'Cash on Delivery',
    'card' => 'Card Payment',
    default => ucfirst(str_replace('_', ' ', $order->payment_method)),
};
@endphp

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- ── HEADER ── -->
        <tr>
          <td style="background:linear-gradient(135deg,#14532d 0%,#166534 60%,#15803d 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:0.5px;margin-bottom:14px;">🛒 {{ $appName }}</div>
            <div style="background:rgba(255,255,255,0.15);border-radius:50px;display:inline-block;padding:10px 28px;">
              <span style="font-size:20px;">✅</span>
              <span style="font-size:16px;font-weight:700;color:#ffffff;margin-left:8px;vertical-align:middle;">Order Confirmed!</span>
            </div>
            <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:14px 0 0;">We've received your order and we're getting it ready.</p>
          </td>
        </tr>

        <!-- ── BODY ── -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;">

            <p style="font-size:17px;color:#111827;font-weight:600;margin:0 0 6px;">Hi {{ $customer->name ?? 'Valued Customer' }},</p>
            <p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.7;">
              Great news! Your order has been <strong style="color:#166534;">confirmed</strong> and is now being prepared. We'll notify you when your items are out for delivery.
            </p>

            <!-- Order Number Banner -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:top;">
                        <p style="font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;font-weight:700;">Order Number</p>
                        <p style="font-size:22px;color:#14532d;font-weight:800;margin:0;">#{{ $order->order_number }}</p>
                      </td>
                      <td style="vertical-align:top;text-align:right;">
                        <p style="font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;font-weight:700;">Order Date</p>
                        <p style="font-size:14px;color:#374151;font-weight:600;margin:0;">{{ $order->created_at->format('M d, Y') }}</p>
                        <p style="font-size:12px;color:#6b7280;margin:2px 0 0;">{{ $order->created_at->format('h:i A') }}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            @if($order->delivery_date)
            <!-- Estimated Delivery -->
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 20px;margin-bottom:24px;text-align:center;">
              <p style="font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;font-weight:700;">🗓 Estimated Delivery</p>
              <p style="font-size:18px;color:#78350f;font-weight:800;margin:0;">{{ $order->delivery_date->format('l, M d, Y') }}</p>
              @if($order->delivery_time_slot)
              <p style="font-size:13px;color:#92400e;margin:4px 0 0;">{{ $order->delivery_time_slot }}</p>
              @endif
            </div>
            @endif

            <!-- Items Table -->
            <p style="font-size:15px;font-weight:700;color:#111827;margin:0 0 14px;border-bottom:2px solid #f3f4f6;padding-bottom:10px;">Your Items</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              @foreach($items as $item)
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:12px 0;vertical-align:middle;">
                  <p style="font-size:14px;color:#111827;font-weight:600;margin:0 0 2px;">{{ $item->product_name }}</p>
                  @if($item->product_sku && $item->product_sku !== '-')
                  <p style="font-size:11px;color:#9ca3af;margin:0;">SKU: {{ $item->product_sku }}</p>
                  @endif
                </td>
                <td style="padding:12px 8px;text-align:center;vertical-align:middle;white-space:nowrap;">
                  <span style="font-size:13px;color:#6b7280;">x{{ $item->quantity }}</span>
                </td>
                <td style="padding:12px 0;text-align:right;vertical-align:middle;white-space:nowrap;">
                  <span style="font-size:14px;color:#374151;font-weight:600;">{{ number_format($item->subtotal, 2) }} EGP</span>
                </td>
              </tr>
              @endforeach
            </table>

            <!-- Order Total -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="width:50%;">&nbsp;</td>
                <td style="width:50%;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                    <tr><td style="padding:14px 18px 0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size:13px;color:#6b7280;padding-bottom:7px;">Subtotal</td>
                          <td style="font-size:13px;color:#374151;text-align:right;padding-bottom:7px;">{{ number_format($order->subtotal, 2) }} EGP</td>
                        </tr>
                        @if($order->delivery_fee > 0)
                        <tr>
                          <td style="font-size:13px;color:#6b7280;padding-bottom:7px;">Delivery Fee</td>
                          <td style="font-size:13px;color:#374151;text-align:right;padding-bottom:7px;">{{ number_format($order->delivery_fee, 2) }} EGP</td>
                        </tr>
                        @endif
                        @if($order->discount > 0)
                        <tr>
                          <td style="font-size:13px;color:#059669;padding-bottom:7px;">Discount@if($promo) ({{ $promo['code'] ?? '' }})@endif</td>
                          <td style="font-size:13px;color:#059669;text-align:right;padding-bottom:7px;">-{{ number_format($order->discount, 2) }} EGP</td>
                        </tr>
                        @endif
                      </table>
                    </td></tr>
                    <tr><td style="padding:0 18px 14px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #166534;">
                        <tr>
                          <td style="font-size:16px;color:#111827;font-weight:800;padding-top:10px;">Total</td>
                          <td style="font-size:16px;color:#166534;font-weight:800;text-align:right;padding-top:10px;">{{ number_format($order->total, 2) }} EGP</td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Delivery & Payment -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                @if($address)
                <td style="width:50%;vertical-align:top;padding-right:8px;">
                  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;height:100%;">
                    <p style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">📍 Deliver To</p>
                    <p style="font-size:13px;color:#374151;line-height:1.7;margin:0;">
                      @if(!empty($address['label']))<strong>{{ $address['label'] }}</strong><br>@endif
                      {{ $address['street'] ?? '' }}
                      @if(!empty($address['building'])), Bld {{ $address['building'] }}@endif
                      @if(!empty($address['floor'])), Fl {{ $address['floor'] }}@endif
                      @if(!empty($address['apartment'])), Apt {{ $address['apartment'] }}@endif
                      <br>{{ $address['city'] ?? '' }}
                      @if(!empty($address['area'])), {{ $address['area'] }}@endif
                    </p>
                  </div>
                </td>
                @endif
                <td style="{{ $address ? 'width:50%;' : 'width:100%;' }}vertical-align:top;{{ $address ? 'padding-left:8px;' : '' }}">
                  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;">
                    <p style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">💳 Payment Method</p>
                    <p style="font-size:14px;color:#374151;font-weight:600;margin:0;">{{ $paymentLabel }}</p>
                    @php
                      $ps = $order->payment_status;
                      $psColor = $ps === 'completed' ? '#166534' : ($ps === 'failed' ? '#dc2626' : '#d97706');
                    @endphp
                    <p style="font-size:12px;color:{{ $psColor }};margin:6px 0 0;font-weight:600;text-transform:capitalize;">{{ str_replace('_', ' ', $ps) }}</p>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Status Timeline Hint -->
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
              <p style="font-size:13px;color:#0369a1;font-weight:700;margin:0 0 10px;">🔔 What Happens Next?</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#0c4a6e;">✅ <strong>Confirmed</strong> – Your order is accepted</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#6b7280;">👨‍🍳 <strong>Preparing</strong> – We're packing your items</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#6b7280;">🚚 <strong>Out for Delivery</strong> – Your order is on the way</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#6b7280;">🎉 <strong>Delivered</strong> – Enjoy your order!</td>
                </tr>
              </table>
            </div>

          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
            <p style="font-size:13px;font-weight:700;color:#166534;margin:0 0 6px;">Thank you for shopping with {{ $appName }}! 🎉</p>
            <p style="font-size:12px;color:#9ca3af;margin:0;">Questions? Contact us at <a href="mailto:support@elbaraka.com" style="color:#166534;text-decoration:none;">support@elbaraka.com</a></p>
            <p style="font-size:11px;color:#d1d5db;margin:10px 0 0;">&copy; {{ date('Y') }} {{ $appName }}. All rights reserved. · Cairo, Egypt</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
