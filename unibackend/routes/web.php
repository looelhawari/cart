<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Paymob Response Callback - Redirect to app after payment
Route::get('/payment-success', function () {
    // Extract query parameters
    $orderId = request()->query('merchant_order_id');
    $success = request()->query('success', 'false');
    $txnResponse = request()->query('txn_response_code');

    // Build deep link to open the app
    // This will be caught by the WebView navigation handler in payment-webview.tsx
    return view('payment-redirect', [
        'orderId' => $orderId,
        'success' => $success === 'true',
        'txnResponse' => $txnResponse,
    ]);
});

// Payment Return - Redirect to deep link (sanitized against XSS)
Route::get('/payment-return', function () {
    // Whitelist only known safe Paymob callback parameters
    $allowedParams = ['id', 'pending', 'amount_cents', 'success', 'order',
        'merchant_order_id', 'is_3d_secure', 'is_auth', 'is_capture',
        'is_standalone_payment', 'is_voided', 'is_refunded', 'is_void',
        'error_occured', 'has_parent_transaction', 'source_data_type',
        'source_data_pan', 'source_data_sub_type', 'txn_response_code',
        'currency', 'created_at', 'integration_id', 'owner', 'data_message',
    ];
    $params = array_intersect_key(request()->all(), array_flip($allowedParams));

    // Sanitize all values — strip anything that could break JS/HTML context
    $sanitizedParams = array_map(function ($value) {
        return preg_replace('/[^a-zA-Z0-9_\-\.@:\/\s]/', '', (string) $value);
    }, $params);

    $queryString = http_build_query($sanitizedParams);
    // HTML-encode the deep link before injection into JS string
    $deepLink = htmlspecialchars("elbaraka://payment-return?" . $queryString, ENT_QUOTES, 'UTF-8');

    return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Processing Payment...</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            text-align: center;
            color: white;
        }
        .spinner {
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 4px solid white;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h2>Payment Processed</h2>
        <p>Returning to app...</p>
    </div>
    <script>
        // Attempt deep link redirect
        window.location.href = "{$deepLink}";

        // Fallback: If deep link doesn't work after 2 seconds, show message
        setTimeout(function() {
            document.querySelector('.container').innerHTML =
                '<h2>Please return to the app</h2>' +
                '<p>If the app did not open automatically, please manually return to ElBaraka.</p>';
        }, 2000);
    </script>
</body>
</html>
HTML;
});
