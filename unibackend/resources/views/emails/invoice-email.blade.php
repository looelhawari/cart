<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Invoice</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                    {{-- Header --}}
                    <tr>
                        <td style="background: linear-gradient(135deg, #166534, #15803d); padding:32px 40px; text-align:center;">
                            <h1 style="color:#ffffff; font-size:28px; margin:0; font-weight:700; letter-spacing:-0.5px;">CART</h1>
                            <p style="color:rgba(255,255,255,0.8); font-size:13px; margin:8px 0 0;">Your Invoice is Ready</p>
                        </td>
                    </tr>

                    {{-- Body --}}
                    <tr>
                        <td style="padding:32px 40px;">
                            <p style="font-size:16px; color:#18181b; margin:0 0 16px;">Hi {{ $customerName }},</p>
                            <p style="font-size:14px; color:#52525b; line-height:1.6; margin:0 0 24px;">
                                Please find attached the invoice for your order. Here's a quick summary:
                            </p>

                            {{-- Order Summary Card --}}
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4; border-radius:12px; border:1px solid #bbf7d0;">
                                <tr>
                                    <td style="padding:20px 24px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="font-size:12px; color:#166534; text-transform:uppercase; letter-spacing:1px; font-weight:600; padding-bottom:8px;">Order Number</td>
                                                <td align="right" style="font-size:12px; color:#166534; text-transform:uppercase; letter-spacing:1px; font-weight:600; padding-bottom:8px;">Total</td>
                                            </tr>
                                            <tr>
                                                <td style="font-size:18px; color:#18181b; font-weight:700;">#{{ $orderNumber }}</td>
                                                <td align="right" style="font-size:18px; color:#166534; font-weight:700;">{{ $total }} EGP</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="font-size:14px; color:#52525b; line-height:1.6; margin:24px 0 0;">
                                The PDF invoice is attached to this email. If you have any questions, please don't hesitate to contact our support team.
                            </p>
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="padding:24px 40px; border-top:1px solid #e4e4e7; text-align:center;">
                            <p style="font-size:12px; color:#a1a1aa; margin:0;">Thank you for shopping with CART!</p>
                            <p style="font-size:11px; color:#d4d4d8; margin:8px 0 0;">&copy; {{ date('Y') }} CART. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
