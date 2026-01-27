<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment {{ $success ? 'Successful' : 'Processing' }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
            max-width: 400px;
        }
        .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
        }
        .success { background: #10b981; }
        .processing { background: #f59e0b; }
        h1 {
            color: #1f2937;
            font-size: 24px;
            margin: 0 0 10px;
        }
        p {
            color: #6b7280;
            line-height: 1.6;
            margin: 0 0 20px;
        }
        .spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon {{ $success ? 'success' : 'processing' }}">
            @if($success)
                ✓
            @else
                ⏱
            @endif
        </div>
        <h1>{{ $success ? 'Payment Successful!' : 'Payment Processing' }}</h1>
        <p>{{ $success ? 'Your payment has been confirmed.' : 'Your payment is being verified. Please wait...' }}</p>
        <div class="spinner"></div>
        <p style="font-size: 14px;">Redirecting to your app...</p>
    </div>

    <script>
        // Auto-close WebView after 2 seconds
        // The WebView navigation handler should have already caught this URL
        setTimeout(function() {
            window.location.href = 'about:blank';
        }, 2000);
    </script>
</body>
</html>
