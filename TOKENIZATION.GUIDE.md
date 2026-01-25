### Super Prompt for Implementing Paymob Card Tokenization in Hypermarket App

You are a senior backend developer agent tasked with implementing card tokenization in the Paymob payment system for the hypermarket app. Your goal is to ensure a perfect, bug-free implementation that matches real-world hypermarket scenarios, where customers can save cards for one-click payments. This includes both tokenization flows (during a standard payment with amount > 0 and standalone with amount = 0), using saved tokens for future payments via MOTO (Mail Order/Telephone Order - for server-side, non-interactive recurring or one-click payments without customer presence) and 3DS (3D Secure - for interactive payments with customer presence, requiring authentication like OTP or challenge).

**THE MOST IMPORTANT RULE: BEFORE PROCEEDING TO ANY STEP, ALWAYS CHECK THE CURRENT IMPLEMENTATION STATE THOROUGHLY FOR THAT ASPECT. DO NOT ASSUME ANYTHING IS ALREADY DONE CORRECTLY. INSPECT CODE, LOGS, DATABASE, API RESPONSES, AND TEST IN SANDBOX TO IDENTIFY ANY BUGS, ERRORS, OR INCONSISTENCIES. FIX ANY ISSUES FOUND BEFORE MOVING TO THE NEXT STEP. ONLY PROCEED WHEN THE CURRENT STEP IS 100% IMPLEMENTED CORRECTLY AND VERIFIED.**

Do not think or plan independently; follow these steps exactly in order, one by one. Each step includes precise instructions, what to check, how to implement, Postman requests (use Paymob's official Postman collection), and verification. All API calls are server-side. Use EGP currency. Test everything in sandbox mode first using Paymob test cards (e.g., Visa: 4987654321098769, expiry 05/25, CVV 123). Switch to live only after full testing.

Download Paymob's official Postman collection from their developer portal (https://developers.paymob.com/) under "API Reference" or dashboard. Import it into Postman for testing all requests. If not found, search "Paymob Postman collection" and download from official sources.

#### Step A: Verify Paymob Account Setup and Enable Features
1. Log into Paymob dashboard (https://dashboard.paymob.com) using credentials.
2. Check current account status: Ensure it's active, KYC approved, and set for Egypt (EGP).
3. Navigate to Settings > Integrations > Online Card. Check if "Card Tokenization" or "Save Card" is enabled. Since user mentioned enabling the checkbox, confirm "Show Save Card Option" is ON in Checkout Customization.
4. If MOTO is not enabled, contact Paymob support via dashboard chat or email (support@paymob.com) to request "MOTO" activation for recurring/server-side payments. Explain it's for hypermarket app's one-click feature. Wait for confirmation email (usually 1-2 days).
5. Check API keys: In Settings > API Keys, note API Key, Public Key, Secret Key, HMAC Secret. Ensure they are stored securely in your app's .env file (e.g., PAYMOB_API_KEY=xxx).
6. Check webhook setup: In Settings > Webhooks, verify your server's webhook URL is added (e.g., https://yourapp.com/paymob-webhook). Test by sending a sample webhook from dashboard if available.
7. Bug check: Run a test authentication request via Postman (see Step B). If any errors (e.g., 401 Unauthorized), fix key issues. Query dashboard logs for recent errors.
8. Verification: Document findings in a log file (e.g., implementation_log.md). Only proceed if all are correct/no bugs.

#### Step B: Implement and Verify Authentication Token Generation
1. Check current code: Search backend code for authentication endpoint calls (POST /auth/tokens). Inspect if it handles token expiration (1 hour) and refreshes automatically.
2. If missing or buggy (e.g., no error handling for invalid key), implement as follows:
   - Endpoint: POST https://accept.paymob.com/api/auth/tokens
   - Headers: Content-Type: application/json
   - Body: {"api_key": "{{PAYMOB_API_KEY}}"}
   - Example Postman request: In Paymob collection, use "Authentication Request". Replace variables.
   - Response: {"token": "long_string"}
3. In code (e.g., Node.js):
   ```
   const axios = require('axios');
   async function getAuthToken() {
     try {
       const response = await axios.post('https://accept.paymob.com/api/auth/tokens', { api_key: process.env.PAYMOB_API_KEY });
       return response.data.token;
     } catch (error) {
       console.error('Auth error:', error.response.data); // Log for bugs
       throw error;
     }
   }
   ```
4. Bug check: Test in Postman; expect 200 OK. If 400/401, check key validity. In app, log calls and handle retries.
5. Verification: Call it in sandbox, store token temporarily. Confirm no leaks. Proceed only if successful 5 times in a row.

#### Step C: Implement and Verify Order Creation
1. Check current code: Look for order creation (POST /ecommerce/orders). Check if it handles amount_cents correctly (integer, e.g., 100 for 1 EGP), items array, and currency "EGP".
2. Implement if missing:
   - Endpoint: POST https://accept.paymob.com/api/ecommerce/orders
   - Headers: Authorization: Bearer {{auth_token}}, Content-Type: application/json
   - Body example for standard payment: 
     ```
     {
       "auth_token": "{{auth_token}}",
       "delivery_needed": false,
       "amount_cents": 10000, // For standalone tokenization, set to 0
       "currency": "EGP",
       "items": [{"name": "Item", "amount_cents": 10000, "description": "Hypermarket product", "quantity": 1}]
     }
     ```
   - Postman: Use "Create Order" request in collection.
   - Response: {"id": order_id}
3. Code snippet: Add to your payment service, with error handling.
4. Bug check: Test with amount=0 and >0. Check for validation errors (e.g., amount must be >=0). Ensure order_id is saved in DB with user/order details.
5. Verification: Create 2 test orders (one with amount=100, one=0). Confirm in dashboard > Transactions. Fix any mismatches before proceeding.

#### Step D: Implement and Verify Payment Key Request for Tokenization
1. Check current code: Search for POST /acceptance/payment_keys. Check if it includes "token" for saved cards, "save_card" or checkbox handling, billing_data (required fields).
2. Implement both flows:
   - For tokenization during standard payment (amount >0, real purchase in hypermarket checkout):
     - Body add: "lock_order_when_paid": true (optional for hypermarkets to prevent changes).
     - To enable saving: If checkbox enabled in dashboard, customer checks it in iframe; token auto-generated if checked.
   - For standalone tokenization (amount=0, "Add Card" feature in user profile):
     - Set amount_cents: 0 in body.
     - Add "save_card": true (forces saving, but since checkbox is enabled, rely on user opt-in).
   - Endpoint: POST https://accept.paymob.com/api/acceptance/payment_keys
   - Headers: Authorization: Bearer {{auth_token}}
   - Body base:
     ```
     {
       "auth_token": "{{auth_token}}",
       "order_id": "{{order_id}}",
       "integration_id": "{{YOUR_INTEGRATION_ID}}", // From dashboard
       "amount_cents": 10000, // 0 for standalone
       "currency": "EGP",
       "billing_data": { // All fields mandatory, use "NA" for optional
         "apartment": "NA",
         "email": "user@email.com",
         "first_name": "Kareem",
         "last_name": "Last",
         "street": "NA",
         "building": "NA",
         "floor": "NA",
         "phone_number": "+20123456789",
         "shipping_method": "NA",
         "postal_code": "NA",
         "city": "Cairo",
         "country": "EG",
         "state": "Cairo"
       }
     }
     ```
   - For standalone, add "expiration": 3600 (optional, token expiry in seconds).
   - Postman: Use "Payment Key Request" in collection. Test with variables.
   - Response: {"token": "payment_key"}
3. Bug check: Ensure billing_data has no typos (causes 400). Test amount=0; should not charge but verify card.
4. Verification: Generate key for both flows. See in Postman response. Proceed only if no errors.

#### Step E: Implement and Verify Payment iFrame for Card Entry
1. Check current frontend: Search for iframe loading in checkout or profile page. Check if it includes ?card_token= or save checkbox.
2. Implement: In app (web/mobile), load iframe: https://accept.paymob.com/api/acceptance/iframes/{{IFRAME_ID}}?payment_token={{payment_key}}
   - IFRAME_ID from dashboard integrations.
   - Customer enters card, checks "Save Card" checkbox (enabled per user mention).
   - On submit, Paymob processes, redirects to your success/failure URL (set in integration or body).
3. For standalone: Same, but no charge.
4. Bug check: Test in browser; ensure iframe loads without CORS errors. Check console for JS issues.
5. Verification: Enter test card, check box, submit. Confirm redirect. Fix UI bugs before proceeding.

#### Step F: Implement and Verify Webhook for Receiving Token and Masked Card
1. Check current webhook endpoint: Inspect server code for /paymob-webhook. Check signature verification, parsing payload for card_token, last_four_digits, card_subtype.
2. Implement:
   - Endpoint: POST your webhook URL.
   - Verify HMAC: Use HMAC Secret to hash payload and match headers['hmac'].
   - Code example (Node.js):
     ```
     app.post('/paymob-webhook', (req, res) => {
       const hmac = crypto.createHmac('sha512', process.env.PAYMOB_HMAC_SECRET).update(JSON.stringify(req.body)).digest('hex');
       if (hmac !== req.headers.hmac) return res.status(401).send('Invalid');
       const data = req.body.obj;
       if (data.success) {
         const token = data.payment_method_data.card_token; // Or data.card_token
         const masked = data.payment_method_data.masked_pan; // e.g., **** **** **** 1234
         const last4 = masked.slice(-4);
         // Save to DB: user_id, token, last4, card_type (e.g., Visa)
       }
       res.sendStatus(200);
     });
     ```
   - In payload for success=true: Extract obj.data.card_token (token string), obj.data.acquirer_response.masked_pan or similar for masked, last_four_digits.
   - For real hypermarkets, display masked (last 4 digits) in app's saved cards list (e.g., "Visa ending 1234").
3. Bug check: Send test webhook from Postman (copy sample from Paymob docs). Check logs for parsing errors.
4. Verification: After iframe submit with checkbox, receive webhook, confirm token in logs/DB. Test 10 times.

#### Step G: Implement and Verify Using Saved Token for Future Payments
1. Check current code: Look for payment with token (no iframe for MOTO).
2. When to use each:
   - **3DS Flow**: Use when customer is present (e.g., in-app checkout, requires interaction like CVV or 3DS challenge). Ideal for first-time or high-value hypermarket purchases to reduce fraud.
   - **MOTO Flow**: Use for one-click (server-side, no customer presence, e.g., auto-restock subscriptions or quick pay with saved card without CVV if allowed). Requires MOTO enabled. Perfect for real-world hypermarkets' loyalty programs or repeat orders.
3. Implement:
   - Repeat Steps B-C for new order.
   - In payment key request, add "token": "{{saved_token}}"
   - For 3DS: Generate payment_key, load iframe (may prompt CVV/3DS).
   - For MOTO: Add "source": "card", "moto": true (if enabled). No iframe; process directly.
     - Body add: "cvc": "123" if required for MOTO (customer provides CVV for first use).
   - Postman: Test "Pay with Token" request in collection.
4. Bug check: Test MOTO only if enabled; else fallback to 3DS. Check for "token invalid" errors.
5. Verification: Use saved token from DB, process test payment (amount=100). Confirm in dashboard. Test both flows.

#### Step H: Full System Testing and Bug Hunting
1. End-to-end test: Simulate hypermarket scenarios - add card (standalone), save during purchase, one-click MOTO, 3DS pay.
2. Check DB: Ensure tokens stored securely (encrypted), with last4 for display. No raw cards.
3. Error handling: Implement for all responses (e.g., 402 payment failed, log and notify user).
4. Security: Ensure PCI compliance; no card data on servers.
5. Performance: Test with multiple users; check token expiry.
6. Bug check: Use Postman to simulate failures. Review app logs, dashboard for discrepancies.
7. Verification: Run 50 test transactions. Document bugs fixed.

#### Step I: Go Live and Monitoring
1. Switch to live keys.
2. Monitor dashboard for live transactions.
3. Update app privacy: Mention card saving via Paymob.
4. Final check: Confirm no bugs in production simulation.

Report completion with log file. If any step fails, stop and fix.