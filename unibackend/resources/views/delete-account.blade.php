<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delete Account — CART</title>
    <style>
        :root {
            --primary: #16a34a;
            --primary-dark: #15803d;
            --danger: #ef4444;
            --danger-dark: #dc2626;
            --text: #1e293b;
            --text-secondary: #64748b;
            --bg: #f8fafc;
            --card: #ffffff;
            --border: #e2e8f0;
            --warning-bg: #fffbeb;
            --warning-border: #f59e0b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.7;
            font-size: 16px;
        }

        .header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }

        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .header p {
            font-size: 14px;
            opacity: 0.9;
        }

        .container {
            max-width: 700px;
            margin: 0 auto;
            padding: 40px 20px 80px;
        }

        .card {
            background: var(--card);
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            border: 1px solid var(--border);
        }

        h2 {
            font-size: 22px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 16px;
        }

        h3 {
            font-size: 18px;
            font-weight: 600;
            color: var(--text);
            margin-top: 16px;
            margin-bottom: 10px;
        }

        p { margin-bottom: 12px; }

        ul {
            margin: 12px 0 12px 24px;
        }

        li { margin-bottom: 8px; }

        .warning-box {
            background: var(--warning-bg);
            border: 1px solid var(--warning-border);
            border-left: 4px solid var(--warning-border);
            padding: 16px 20px;
            border-radius: 0 12px 12px 0;
            margin: 20px 0;
        }

        .warning-box strong {
            color: #92400e;
        }

        .danger-box {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-left: 4px solid var(--danger);
            padding: 16px 20px;
            border-radius: 0 12px 12px 0;
            margin: 20px 0;
        }

        .danger-box strong {
            color: var(--danger-dark);
        }

        .step-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: var(--primary);
            color: white;
            border-radius: 50%;
            font-weight: 700;
            font-size: 14px;
            margin-right: 12px;
            flex-shrink: 0;
        }

        .step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 20px;
        }

        .step-content {
            flex: 1;
        }

        .step-content strong {
            display: block;
            margin-bottom: 4px;
        }

        .divider {
            height: 1px;
            background: var(--border);
            margin: 32px 0;
        }

        /* Form Styles */
        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 15px;
        }

        input[type="email"],
        input[type="password"],
        textarea {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid var(--border);
            border-radius: 12px;
            font-size: 16px;
            font-family: inherit;
            transition: border-color 0.2s;
            background: var(--bg);
        }

        input:focus, textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
        }

        textarea {
            resize: vertical;
            min-height: 100px;
        }

        .btn-delete {
            display: inline-block;
            background: var(--danger);
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s, transform 0.1s;
            width: 100%;
            text-align: center;
        }

        .btn-delete:hover {
            background: var(--danger-dark);
        }

        .btn-delete:active {
            transform: scale(0.98);
        }

        .btn-delete:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .success-message {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-left: 4px solid var(--primary);
            padding: 20px;
            border-radius: 0 12px 12px 0;
            margin: 20px 0;
            display: none;
        }

        .success-message.show {
            display: block;
        }

        .error-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: var(--danger-dark);
            padding: 12px 16px;
            border-radius: 12px;
            margin: 12px 0;
            font-size: 14px;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.8s linear infinite;
            vertical-align: middle;
            margin-right: 8px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        a {
            color: var(--primary);
            text-decoration: none;
        }

        a:hover { text-decoration: underline; }

        .footer {
            text-align: center;
            padding: 32px 20px;
            color: var(--text-secondary);
            font-size: 14px;
            border-top: 1px solid var(--border);
            margin-top: 40px;
        }

        @media (max-width: 600px) {
            .header h1 { font-size: 24px; }
            .card { padding: 20px; }
            .container { padding: 20px 16px 60px; }
        }
    </style>
</head>
<body>

<div class="header">
    <h1>🛒 CART</h1>
    <p>Account Deletion Request</p>
</div>

<div class="container">

    <!-- Developer Info -->
    <div class="card">
        <h2>Delete Your CART Account</h2>
        <p>This page allows you to request the deletion of your <strong>CART</strong> account and all associated personal data. This process is provided by <strong>CART</strong>, the developer of the CART app available on Google Play.</p>

        <div class="warning-box">
            <strong>⚠️ Before You Proceed</strong>
            <p style="margin-bottom: 0; margin-top: 8px;">Account deletion is permanent and <strong>cannot be undone</strong>. Please make sure you have completed any pending orders before requesting deletion.</p>
        </div>
    </div>

    <!-- What Gets Deleted -->
    <div class="card">
        <h2>What Happens When You Delete Your Account</h2>

        <h3>Data That Will Be Permanently Deleted:</h3>
        <ul>
            <li>Your personal profile (name, email, phone number, date of birth, gender)</li>
            <li>All saved delivery addresses</li>
            <li>Saved payment methods (tokenized card references)</li>
            <li>Favorites / wishlist items</li>
            <li>Notification preferences and push notification tokens</li>
            <li>Shopping cart contents</li>
            <li>Product watchlist and price alerts</li>
            <li>Search history</li>
            <li>Complaint/support ticket messages</li>
            <li>Login history and session tokens</li>
            <li>Social login connections (Google)</li>
        </ul>

        <h3>Data That Will Be Retained (Anonymized):</h3>
        <ul>
            <li><strong>Order history:</strong> Your name and personal details will be removed, but anonymized order records are retained for up to 3 years as required by financial and tax regulations.</li>
            <li><strong>Payment transactions:</strong> Anonymized transaction records are retained for up to 3 years for financial compliance and refund processing.</li>
            <li><strong>Reviews:</strong> Published product reviews will be anonymized (displayed as "Deleted User") but the review content may be retained.</li>
        </ul>

        <div class="danger-box">
            <strong>⚠️ Important Notes:</strong>
            <ul style="margin-bottom: 0;">
                <li>Any active orders will be completed before your account is deleted.</li>
                <li>You will not be able to recover your account or data after deletion.</li>
                <li>Deletion will be completed within <strong>7 days</strong> of your request.</li>
            </ul>
        </div>
    </div>

    <!-- Steps to Delete From App -->
    <div class="card">
        <h2>How to Delete Your Account</h2>

        <h3>Option 1: From the CART App</h3>
        <div class="step">
            <span class="step-number">1</span>
            <div class="step-content">
                <strong>Open the CART app</strong>
                <span>Launch the CART app on your device.</span>
            </div>
        </div>
        <div class="step">
            <span class="step-number">2</span>
            <div class="step-content">
                <strong>Go to Profile</strong>
                <span>Tap the "Profile" tab at the bottom of the screen.</span>
            </div>
        </div>
        <div class="step">
            <span class="step-number">3</span>
            <div class="step-content">
                <strong>Request Account Deletion</strong>
                <span>Tap "Delete Account" and confirm your identity with your password. Your account will be scheduled for deletion.</span>
            </div>
        </div>

        <div class="divider"></div>

        <h3>Option 2: Using the Form Below</h3>
        <p>If you cannot access the app, you can request account deletion using the form below. You must provide the email address and password associated with your CART account for identity verification.</p>
    </div>

    <!-- Deletion Form -->
    <div class="card" id="deletion-form-card">
        <h2>Request Account Deletion</h2>

        <div class="success-message" id="success-msg">
            <strong style="color: #15803d; font-size: 18px;">✅ Account Deletion Request Submitted</strong>
            <p style="margin-top: 12px;">Your account deletion request has been received and is being processed. Your account will be deactivated immediately and all personal data will be permanently deleted within <strong>7 days</strong>.</p>
            <p>A confirmation email has been sent to your registered email address.</p>
            <p style="margin-bottom: 0; color: #64748b; font-size: 14px;">If you did not make this request, please contact us immediately at <a href="mailto:kareemhesham105@gmail.com">kareemhesham105@gmail.com</a>.</p>
        </div>

        <form id="delete-form" method="POST" action="/delete-account" novalidate>
            <input type="hidden" name="_token" value="{{ csrf_token() }}">

            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" placeholder="Enter your registered email address" required autocomplete="email">
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" placeholder="Enter your account password" required autocomplete="current-password">
            </div>

            <div class="form-group">
                <label for="reason">Reason for Deletion (Optional)</label>
                <textarea id="reason" name="reason" placeholder="Please let us know why you want to delete your account. This helps us improve our service."></textarea>
            </div>

            <div class="error-message" id="error-msg"></div>

            <button type="submit" class="btn-delete" id="submit-btn">
                Delete My Account Permanently
            </button>
        </form>
    </div>

    <!-- Contact -->
    <div class="card">
        <h2>Need Help?</h2>
        <p>If you have any questions about account deletion or data privacy, please contact us:</p>
        <ul>
            <li><strong>Email:</strong> <a href="mailto:kareemhesham105@gmail.com">kareemhesham105@gmail.com</a></li>
            <li><strong>In-App:</strong> Profile → Help & Support → Contact Support</li>
            <li><strong>Privacy Policy:</strong> <a href="/privacy-policy">View our Privacy Policy</a></li>
        </ul>
    </div>

</div>

<div class="footer">
    <p>&copy; {{ date('Y') }} CART. All rights reserved.</p>
</div>

<script>
document.getElementById('delete-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btn = document.getElementById('submit-btn');
    const errorEl = document.getElementById('error-msg');
    const successEl = document.getElementById('success-msg');
    const form = document.getElementById('delete-form');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const reason = document.getElementById('reason').value.trim();

    // Client-side validation
    if (!email) {
        errorEl.textContent = 'Please enter your email address.';
        errorEl.classList.add('show');
        return;
    }

    if (!password) {
        errorEl.textContent = 'Please enter your password to verify your identity.';
        errorEl.classList.add('show');
        return;
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorEl.textContent = 'Please enter a valid email address.';
        errorEl.classList.add('show');
        return;
    }

    // Confirm
    const confirmed = confirm(
        'Are you sure you want to permanently delete your account?\n\n' +
        'This action CANNOT be undone. All your data, including profile, addresses, ' +
        'saved cards, favorites, and cart will be permanently deleted.\n\n' +
        'Click OK to proceed with deletion.'
    );

    if (!confirmed) return;

    // Disable button and show loading
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processing...';
    errorEl.classList.remove('show');

    try {
        const response = await fetch('/delete-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('input[name="_token"]').value,
            },
            body: JSON.stringify({ email, password, reason }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            form.style.display = 'none';
            successEl.classList.add('show');
            window.scrollTo({ top: document.getElementById('deletion-form-card').offsetTop - 20, behavior: 'smooth' });
        } else {
            errorEl.textContent = data.message || 'Failed to process your request. Please try again.';
            errorEl.classList.add('show');
            btn.disabled = false;
            btn.textContent = 'Delete My Account Permanently';
        }
    } catch (err) {
        errorEl.textContent = 'A network error occurred. Please check your connection and try again.';
        errorEl.classList.add('show');
        btn.disabled = false;
        btn.textContent = 'Delete My Account Permanently';
    }
});

// Clear error on input
document.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
        document.getElementById('error-msg').classList.remove('show');
    });
});
</script>

</body>
</html>
