<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f4f4f4;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
        }
        .logo {
            font-size: 48px;
            margin-bottom: 20px;
        }
        h1 {
            color: #2c5f2d;
            margin-bottom: 20px;
        }
        .otp-box {
            background-color: #fff;
            border: 2px solid #2c5f2d;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #2c5f2d;
        }
        .message {
            color: #666;
            margin: 20px 0;
        }
        .warning {
            color: #d9534f;
            font-size: 14px;
            margin-top: 20px;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🛒</div>
        <h1>ElBaraka</h1>

        <p class="message">
            <strong>{{ $purpose }}</strong>
        </p>

        <p class="message">
            Here is your One-Time Password (OTP):
        </p>

        <div class="otp-box">
            {{ $otp }}
        </div>

        <p class="message">
            This code will expire in <strong>10 minutes</strong>.
        </p>

        <p class="warning">
            ⚠️ If you didn't request this code, please ignore this email.
        </p>

        <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; {{ date('Y') }} ElBaraka. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
