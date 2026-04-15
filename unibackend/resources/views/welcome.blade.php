<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="CART — Egypt's hypermarket app. Fresh groceries, flash deals, and fast delivery across Cairo & Giza. Shop online and get delivered to your door.">
    <meta property="og:title" content="CART — Grocery Shop">
    <meta property="og:description" content="Fresh groceries, unbeatable deals & fast delivery — right to your door.">
    <meta property="og:type" content="website">
    <title>CART — Grocery Shop</title>
    <style>
        :root {
            --green: #22C55E;
            --green-dark: #16a34a;
            --green-deeper: #15803d;
            --text: #1e293b;
            --text-secondary: #64748b;
            --bg: #f8fafc;
            --white: #ffffff;
            --border: #e2e8f0;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        html { scroll-behavior: smooth; }

        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
            background: var(--white);
            color: var(--text);
            line-height: 1.6;
        }

        /* ── NAV ── */
        nav {
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 100;
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border);
            padding: 0 24px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .nav-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 22px;
            font-weight: 800;
            color: var(--green-dark);
            text-decoration: none;
        }

        .nav-logo span {
            font-size: 26px;
        }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .nav-links a {
            text-decoration: none;
            color: var(--text-secondary);
            font-size: 15px;
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 8px;
            transition: all 0.15s;
        }

        .nav-links a:hover { color: var(--green-dark); background: #f0fdf4; }

        .btn-primary {
            background: var(--green-dark);
            color: white !important;
            padding: 10px 22px !important;
            border-radius: 10px !important;
            font-weight: 600 !important;
            transition: all 0.15s !important;
        }

        .btn-primary:hover { background: var(--green-deeper) !important; background-color: var(--green-deeper) !important; }

        /* ── HERO ── */
        .hero {
            padding-top: 64px;
            min-height: 100vh;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .hero::before {
            content: '';
            position: absolute;
            width: 600px; height: 600px;
            background: radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%);
            top: -100px; right: -100px;
            border-radius: 50%;
        }

        .hero::after {
            content: '';
            position: absolute;
            width: 400px; height: 400px;
            background: radial-gradient(circle, rgba(22,163,74,0.1) 0%, transparent 70%);
            bottom: -50px; left: -50px;
            border-radius: 50%;
        }

        .hero-content {
            position: relative;
            z-index: 1;
            max-width: 760px;
            padding: 60px 24px;
        }

        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: white;
            border: 1px solid #bbf7d0;
            color: var(--green-dark);
            font-size: 13px;
            font-weight: 600;
            padding: 6px 14px;
            border-radius: 100px;
            margin-bottom: 28px;
            box-shadow: 0 2px 8px rgba(22,163,74,0.12);
        }

        .hero h1 {
            font-size: clamp(40px, 6vw, 72px);
            font-weight: 800;
            color: var(--text);
            line-height: 1.1;
            margin-bottom: 24px;
            letter-spacing: -1px;
        }

        .hero h1 span {
            color: var(--green-dark);
        }

        .hero p {
            font-size: 20px;
            color: var(--text-secondary);
            max-width: 560px;
            margin: 0 auto 40px;
            line-height: 1.7;
        }

        .hero-cta {
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .store-btn {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 14px 24px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.2s;
        }

        .store-btn-dark {
            background: #1a1a1a;
            color: white;
        }

        .store-btn-dark:hover { background: #333; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

        .store-btn-light {
            background: white;
            color: var(--text);
            border: 1px solid var(--border);
        }

        .store-btn-light:hover { border-color: var(--green); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

        .store-btn svg { flex-shrink: 0; }

        .store-btn-text small { display: block; font-size: 11px; font-weight: 400; opacity: 0.7; }

        .hero-stats {
            display: flex;
            gap: 40px;
            justify-content: center;
            margin-top: 60px;
            flex-wrap: wrap;
        }

        .stat {
            text-align: center;
        }

        .stat-number {
            font-size: 32px;
            font-weight: 800;
            color: var(--green-dark);
        }

        .stat-label {
            font-size: 14px;
            color: var(--text-secondary);
            margin-top: 2px;
        }

        /* ── FEATURES ── */
        .section {
            padding: 100px 24px;
        }

        .section-inner {
            max-width: 1100px;
            margin: 0 auto;
        }

        .section-label {
            display: inline-block;
            background: #f0fdf4;
            color: var(--green-dark);
            font-size: 13px;
            font-weight: 700;
            padding: 5px 14px;
            border-radius: 100px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 16px;
        }

        .section-title {
            font-size: clamp(28px, 4vw, 44px);
            font-weight: 800;
            color: var(--text);
            margin-bottom: 16px;
            line-height: 1.2;
        }

        .section-subtitle {
            font-size: 18px;
            color: var(--text-secondary);
            max-width: 560px;
            line-height: 1.7;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 24px;
            margin-top: 60px;
        }

        .feature-card {
            background: white;
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 32px;
            transition: all 0.2s;
        }

        .feature-card:hover {
            border-color: #86efac;
            box-shadow: 0 8px 32px rgba(22,163,74,0.1);
            transform: translateY(-4px);
        }

        .feature-icon {
            width: 52px; height: 52px;
            background: #f0fdf4;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin-bottom: 20px;
        }

        .feature-card h3 {
            font-size: 18px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 10px;
        }

        .feature-card p {
            font-size: 15px;
            color: var(--text-secondary);
            line-height: 1.6;
        }

        /* ── HOW IT WORKS ── */
        .how-bg { background: #f8fafc; }

        .steps {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 32px;
            margin-top: 60px;
        }

        .step {
            text-align: center;
        }

        .step-number {
            width: 56px; height: 56px;
            background: linear-gradient(135deg, var(--green-dark), var(--green));
            color: white;
            font-size: 22px;
            font-weight: 800;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }

        .step h3 {
            font-size: 17px;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .step p {
            font-size: 14px;
            color: var(--text-secondary);
        }

        /* ── PAYMENT ── */
        .payment-methods {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            margin-top: 40px;
        }

        .payment-chip {
            display: flex;
            align-items: center;
            gap: 8px;
            background: white;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text);
        }

        .payment-chip span { font-size: 20px; }

        /* ── DELIVERY ── */
        .delivery-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 40px;
        }

        .delivery-card {
            background: white;
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 28px;
        }

        .delivery-card h4 {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 8px;
            color: var(--text);
        }

        .delivery-card p {
            font-size: 14px;
            color: var(--text-secondary);
        }

        .delivery-card .tag {
            display: inline-block;
            background: #f0fdf4;
            color: var(--green-dark);
            font-size: 12px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 100px;
            margin-bottom: 12px;
        }

        /* ── CTA ── */
        .cta-section {
            background: linear-gradient(135deg, var(--green-dark) 0%, var(--green-deeper) 100%);
            padding: 100px 24px;
            text-align: center;
        }

        .cta-section h2 {
            font-size: clamp(28px, 4vw, 48px);
            font-weight: 800;
            color: white;
            margin-bottom: 16px;
        }

        .cta-section p {
            font-size: 18px;
            color: rgba(255,255,255,0.85);
            margin-bottom: 40px;
            max-width: 480px;
            margin-left: auto;
            margin-right: auto;
        }

        .cta-btns {
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .cta-btn-white {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: white;
            color: var(--green-dark);
            font-weight: 700;
            font-size: 15px;
            padding: 14px 28px;
            border-radius: 14px;
            text-decoration: none;
            transition: all 0.2s;
        }

        .cta-btn-white:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

        .cta-btn-outline {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: transparent;
            color: white;
            font-weight: 700;
            font-size: 15px;
            padding: 14px 28px;
            border-radius: 14px;
            border: 2px solid rgba(255,255,255,0.4);
            text-decoration: none;
            transition: all 0.2s;
        }

        .cta-btn-outline:hover { border-color: white; transform: translateY(-2px); }

        /* ── FOOTER ── */
        footer {
            background: #1a1a1a;
            color: rgba(255,255,255,0.6);
            padding: 60px 24px 40px;
        }

        .footer-inner {
            max-width: 1100px;
            margin: 0 auto;
        }

        .footer-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 40px;
            flex-wrap: wrap;
            padding-bottom: 40px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 32px;
        }

        .footer-brand {
            font-size: 24px;
            font-weight: 800;
            color: white;
        }

        .footer-brand p {
            font-size: 14px;
            color: rgba(255,255,255,0.5);
            font-weight: 400;
            margin-top: 6px;
        }

        .footer-links h5 {
            color: white;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 16px;
        }

        .footer-links a {
            display: block;
            color: rgba(255,255,255,0.5);
            text-decoration: none;
            font-size: 14px;
            margin-bottom: 10px;
            transition: color 0.15s;
        }

        .footer-links a:hover { color: var(--green); }

        .footer-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            font-size: 13px;
        }

        @media (max-width: 640px) {
            .nav-links { display: none; }
            .delivery-grid { grid-template-columns: 1fr; }
            .footer-top { flex-direction: column; }
            .hero-stats { gap: 24px; }
        }
    </style>
</head>
<body>

<!-- NAV -->
<nav>
    <a href="/" class="nav-logo">
        <span>🛒</span> CART
    </a>
    <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#delivery">Delivery</a>
        <a href="/support">Support</a>
        <a href="/privacy-policy">Privacy</a>
        <a href="#download" class="btn-primary">Download App</a>
    </div>
</nav>

<!-- HERO -->
<section class="hero" id="home">
    <div class="hero-content">
        <div class="hero-badge">
            🇪🇬 Serving Cairo &amp; Giza
        </div>
        <h1>Egypt's Smartest<br><span>Grocery App</span></h1>
        <p>Fresh produce, daily essentials, flash deals, and fast delivery — all in one app. Shop thousands of products and get them delivered to your door.</p>

        <div class="hero-cta">
            <a href="https://apps.apple.com/app/cart-grocery-shop/id6745918856" class="store-btn store-btn-dark" id="download">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                <div class="store-btn-text">
                    <small>Download on the</small>
                    App Store
                </div>
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.cart.hypermarket" class="store-btn store-btn-light">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#3DDC84"><path d="M3.18 23.76c.26.14.56.16.84.06l12.85-6.95-2.98-2.98-10.71 9.87zm-1.27-1.42c-.14-.27-.21-.57-.19-.89V2.55c-.02-.32.05-.62.19-.89l11.4 10.34-11.4 10.34zM22.33 10.3l-2.7-1.46L16.55 12l3.08 3.08 2.7-1.46c.77-.42.77-1.48 0-1.9L22.33 10.3zM4.02.18c-.28-.1-.58-.08-.84.06l10.71 9.87 2.98-2.98L4.02.18z"/></svg>
                <div class="store-btn-text">
                    <small>Get it on</small>
                    Google Play
                </div>
            </a>
        </div>

        <div class="hero-stats">
            <div class="stat">
                <div class="stat-number">1000+</div>
                <div class="stat-label">Products</div>
            </div>
            <div class="stat">
                <div class="stat-number">2</div>
                <div class="stat-label">Governorates</div>
            </div>
            <div class="stat">
                <div class="stat-number">9AM–10PM</div>
                <div class="stat-label">Daily Delivery</div>
            </div>
            <div class="stat">
                <div class="stat-number">Free</div>
                <div class="stat-label">On orders over 200 EGP</div>
            </div>
        </div>
    </div>
</section>

<!-- FEATURES -->
<section class="section" id="features">
    <div class="section-inner">
        <div class="section-label">Features</div>
        <h2 class="section-title">Everything you need,<br>nothing you don't</h2>
        <p class="section-subtitle">CART is built from the ground up for the Egyptian shopper — bilingual, fast, and packed with features.</p>

        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <h3>Flash Deals</h3>
                <p>Daily limited-time offers on your favourite products. Check the deals tab before they're gone.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">📍</div>
                <h3>Real-Time Tracking</h3>
                <p>Watch your order move from the store to your door. Live driver location, every step of the way.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🔐</div>
                <h3>Face ID & Fingerprint</h3>
                <p>Log in instantly with biometric authentication. Secure, fast, and always protected.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">💳</div>
                <h3>Multiple Payment Options</h3>
                <p>Pay with cash, card, or mobile wallets. Powered by Paymob with bank-level encryption.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🌍</div>
                <h3>Arabic & English</h3>
                <p>Full bilingual support. Switch between Arabic and English any time from your profile.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🎟️</div>
                <h3>Promo Codes</h3>
                <p>Exclusive codes and seasonal promotions. Apply at checkout for instant savings.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">💰</div>
                <h3>In-App Wallet</h3>
                <p>Top up your CART wallet for one-tap checkout. Faster, simpler, always ready.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🔔</div>
                <h3>Smart Notifications</h3>
                <p>Push updates at every order stage. Fully configurable — you decide what you hear about.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">⭐</div>
                <h3>Reviews & Ratings</h3>
                <p>Shop with confidence. Read verified reviews and rate products you've actually purchased.</p>
            </div>
        </div>
    </div>
</section>

<!-- HOW IT WORKS -->
<section class="section how-bg" id="how-it-works">
    <div class="section-inner">
        <div class="section-label">How It Works</div>
        <h2 class="section-title">From browsing to doorstep<br>in minutes</h2>
        <div class="steps">
            <div class="step">
                <div class="step-number">1</div>
                <h3>Download & Sign Up</h3>
                <p>Create your account with email, Google, or Apple in under a minute.</p>
            </div>
            <div class="step">
                <div class="step-number">2</div>
                <h3>Browse & Add to Cart</h3>
                <p>Explore categories, flash deals, and offers. Add what you need with one tap.</p>
            </div>
            <div class="step">
                <div class="step-number">3</div>
                <h3>Choose Delivery Slot</h3>
                <p>Pick a time that works for you — same day or schedule ahead.</p>
            </div>
            <div class="step">
                <div class="step-number">4</div>
                <h3>Pay Your Way</h3>
                <p>Cash on delivery, card, mobile wallet, or your CART balance.</p>
            </div>
            <div class="step">
                <div class="step-number">5</div>
                <h3>Track in Real Time</h3>
                <p>Live order status and push notifications at every stage.</p>
            </div>
        </div>
    </div>
</section>

<!-- DELIVERY -->
<section class="section" id="delivery">
    <div class="section-inner">
        <div class="section-label">Delivery</div>
        <h2 class="section-title">Fast delivery across<br>Cairo & Giza</h2>
        <p class="section-subtitle">We deliver daily with flexible time slots and free delivery on orders above 200 EGP.</p>

        <div class="delivery-grid" style="margin-top: 40px;">
            <div class="delivery-card">
                <div class="tag">Free Delivery</div>
                <h4>Orders above 200 EGP</h4>
                <p>Orders below 200 EGP incur a 25 EGP delivery fee. Promotions may offer free delivery on all orders.</p>
            </div>
            <div class="delivery-card">
                <div class="tag">Hours</div>
                <h4>9 AM – 10 PM, Sat–Thu</h4>
                <p>Friday deliveries run from 2 PM to 10 PM. Choose your preferred time slot during checkout.</p>
            </div>
            <div class="delivery-card">
                <div class="tag">Coverage</div>
                <h4>Cairo & Giza</h4>
                <p>Covering most areas in Cairo and Giza governorates. Enter your address to confirm availability.</p>
            </div>
            <div class="delivery-card">
                <div class="tag">Tracking</div>
                <h4>Live Driver Location</h4>
                <p>Track your order from store to door in real time — including your driver's live position on the map.</p>
            </div>
        </div>
    </div>
</section>

<!-- PAYMENT -->
<section class="section how-bg">
    <div class="section-inner">
        <div class="section-label">Payments</div>
        <h2 class="section-title">Pay however you like</h2>
        <p class="section-subtitle">All payments are secured by Paymob with bank-level encryption and 3D Secure authentication.</p>

        <div class="payment-methods">
            <div class="payment-chip"><span>💵</span> Cash on Delivery</div>
            <div class="payment-chip"><span>💳</span> Visa & Mastercard</div>
            <div class="payment-chip"><span>📱</span> Vodafone Cash</div>
            <div class="payment-chip"><span>📱</span> Orange Money</div>
            <div class="payment-chip"><span>📱</span> Etisalat Cash</div>
            <div class="payment-chip"><span>👛</span> CART Wallet</div>
        </div>
    </div>
</section>

<!-- DOWNLOAD CTA -->
<section class="cta-section" id="download">
    <div style="max-width: 720px; margin: 0 auto;">
        <h2>Start shopping smarter today</h2>
        <p>Download CART and get fresh groceries delivered to your door — with deals you won't find in any supermarket.</p>
        <div class="cta-btns">
            <a href="https://apps.apple.com/app/cart-grocery-shop/id6745918856" class="cta-btn-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                App Store
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.cart.hypermarket" class="cta-btn-outline">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M3.18 23.76c.26.14.56.16.84.06l12.85-6.95-2.98-2.98-10.71 9.87zm-1.27-1.42c-.14-.27-.21-.57-.19-.89V2.55c-.02-.32.05-.62.19-.89l11.4 10.34-11.4 10.34zM22.33 10.3l-2.7-1.46L16.55 12l3.08 3.08 2.7-1.46c.77-.42.77-1.48 0-1.9L22.33 10.3zM4.02.18c-.28-.1-.58-.08-.84.06l10.71 9.87 2.98-2.98L4.02.18z"/></svg>
                Google Play
            </a>
        </div>
    </div>
</section>

<!-- FOOTER -->
<footer>
    <div class="footer-inner">
        <div class="footer-top">
            <div class="footer-brand">
                🛒 CART
                <p>Egypt's hypermarket app.<br>Cairo & Giza delivery, daily.</p>
            </div>
            <div class="footer-links">
                <h5>App</h5>
                <a href="https://apps.apple.com/app/cart-grocery-shop/id6745918856">App Store</a>
                <a href="https://play.google.com/store/apps/details?id=com.cart.hypermarket">Google Play</a>
            </div>
            <div class="footer-links">
                <h5>Legal</h5>
                <a href="/privacy-policy">Privacy Policy</a>
                <a href="/delete-account">Delete Account</a>
            </div>
            <div class="footer-links">
                <h5>Help</h5>
                <a href="/support">Support</a>
                <a href="mailto:kareemhesham105@gmail.com">Contact Us</a>
            </div>
        </div>
        <div class="footer-bottom">
            <span>&copy; {{ date('Y') }} CART Grocery Shop. All rights reserved.</span>
            <span>Made with ❤️ in Egypt</span>
        </div>
    </div>
</footer>

</body>
</html>
