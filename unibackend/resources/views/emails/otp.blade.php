<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>{{ $purpose }} — CART</title>
    <!--[if mso]>
    <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
    <![endif]-->
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        body { margin: 0; padding: 0; background-color: #f5f5f5; }
        @media only screen and (max-width: 600px) {
            .wrapper { padding: 20px 16px !important; }
            .card    { padding: 32px 24px !important; }
            .otp-code { font-size: 32px !important; letter-spacing: 10px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

    {{-- Preheader --}}
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f5f5f5;">
        Your {{ $purpose }} code is {{ $otp }}. Valid for 10 minutes. Do not share this code.
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
        <tr>
            <td class="wrapper" style="padding:40px 20px;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;margin:0 auto;">

                    {{-- Brand mark --}}
                    <tr>
                        <td style="padding:0 0 20px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="border-left:3px solid #2E7D32;padding-left:10px;">
                                        <span style="font-size:17px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">CART</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Main card --}}
                    <tr>
                        <td class="card" style="background-color:#ffffff;border-radius:6px;padding:40px 44px;border:1px solid #e4e4e4;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                                {{-- Heading --}}
                                <tr>
                                    <td style="padding-bottom:10px;">
                                        <p style="margin:0;font-size:21px;font-weight:700;color:#111111;line-height:1.3;">
                                            @if($purpose === 'Password Reset')
                                                Reset your password
                                            @elseif($purpose === 'Email Change Verification')
                                                Confirm your new email
                                            @else
                                                Verify your account
                                            @endif
                                        </p>
                                    </td>
                                </tr>

                                {{-- Body copy --}}
                                <tr>
                                    <td style="padding-bottom:28px;">
                                        <p style="margin:0;font-size:14px;color:#555555;line-height:1.65;">
                                            @if($purpose === 'Password Reset')
                                                We received a request to reset your CART account password. Use the code below to continue. If you did not make this request, you can ignore this email — your password will remain unchanged.
                                            @elseif($purpose === 'Email Change Verification')
                                                To confirm your new email address, enter the code below in the CART app.
                                            @else
                                                To complete your CART account setup, enter the code below in the app.
                                            @endif
                                        </p>
                                    </td>
                                </tr>

                                {{-- OTP block --}}
                                <tr>
                                    <td style="padding-bottom:28px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td style="background-color:#fafafa;border-radius:4px;border:1px solid #e4e4e4;padding:18px 22px;">
                                                    <p style="margin:0 0 6px;font-size:10px;font-weight:600;color:#999999;letter-spacing:1.2px;text-transform:uppercase;">Verification code</p>
                                                    <p class="otp-code" style="margin:0;font-size:36px;font-weight:700;color:#111111;letter-spacing:14px;font-family:'SF Mono','Fira Code',Consolas,'Courier New',monospace;line-height:1.2;">{{ $otp }}</p>
                                                    <p style="margin:8px 0 0;font-size:12px;color:#aaaaaa;">This code expires in&nbsp;<strong style="color:#555555;font-weight:600;">10 minutes</strong></p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                {{-- Divider --}}
                                <tr>
                                    <td style="padding-bottom:24px;border-top:1px solid #f0f0f0;"></td>
                                </tr>

                                {{-- Arabic section --}}
                                <tr>
                                    <td>
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" dir="rtl">
                                            <tr>
                                                <td>
                                                    <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#111111;line-height:1.4;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
                                                        @if($purpose === 'Password Reset')
                                                            إعادة تعيين كلمة المرور
                                                        @elseif($purpose === 'Email Change Verification')
                                                            تأكيد البريد الإلكتروني الجديد
                                                        @else
                                                            التحقق من الحساب
                                                        @endif
                                                    </p>
                                                    <p style="margin:0;font-size:13px;color:#666666;line-height:1.7;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
                                                        @if($purpose === 'Password Reset')
                                                            تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك. استخدم الرمز أعلاه للمتابعة. إذا لم تطلب ذلك، تجاهل هذا البريد.
                                                        @elseif($purpose === 'Email Change Verification')
                                                            لتأكيد تغيير بريدك الإلكتروني، أدخل الرمز أعلاه في تطبيق CART.
                                                        @else
                                                            لإتمام إنشاء حسابك في CART، أدخل رمز التحقق أعلاه في التطبيق.
                                                        @endif
                                                    </p>
                                                    <p style="margin:8px 0 0;font-size:12px;color:#aaaaaa;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
                                                        صالح لمدة <strong style="color:#555555;font-weight:600;">١٠ دقائق</strong>
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>

                    {{-- Security note + footer --}}
                    <tr>
                        <td style="padding:20px 0 0;text-align:center;">
                            <p style="margin:0 0 4px;font-size:11px;color:#bbbbbb;line-height:1.6;">
                                If you did not request this, no action is needed. CART will never ask for this code by phone or chat.
                            </p>
                            <p style="margin:0 0 14px;font-size:11px;color:#bbbbbb;line-height:1.6;font-family:'Segoe UI',Tahoma,Arial,sans-serif;" dir="rtl">
                                لم تطلب ذلك؟ تجاهل هذه الرسالة. لن يطلب CART هذا الرمز عبر الهاتف أو الدردشة.
                            </p>
                            <p style="margin:0;font-size:11px;color:#cccccc;">&copy; {{ date('Y') }} CART &mdash; All rights reserved</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>