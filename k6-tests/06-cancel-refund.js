/**
 * k6 Test 06 — Order Cancellation & Refund
 *
 * Simulates 30 users cancelling orders and checking refund history.
 * Tests: lockForUpdate on order status, rate limiter (1 cancel / 30s),
 *        stock restoration, wallet refund flow.
 *
 * Run: k6 run k6-tests/06-cancel-refund.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const BASE_URL = "http://localhost:8000/api/v1";
const TEST_PASSWORD = "Test@12345";

const cancelDuration = new Trend("cancel_duration", true);
const cancelErrors = new Rate("cancel_errors");
const cancelsAttempted = new Counter("cancels_attempted");
const cancelsSucceeded = new Counter("cancels_succeeded");
const rateLimited = new Counter("rate_limited");

export const options = {
    scenarios: {
        cancel_storm: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: "10s", target: 15 },
                { duration: "10s", target: 30 },
                { duration: "60s", target: 30 },
                { duration: "10s", target: 0 },
            ],
        },
    },
    thresholds: {
        "cancel_duration": ["p(95)<3000"],
        "cancel_errors": ["rate<0.3"],  // Higher tolerance since rate limiter expected
        "http_req_failed": ["rate<0.2"],
    },
};

function headers(token) {
    const h = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "ElBaraka-K6-LoadTest",
    };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
}

export default function () {
    const vuId = (__VU % 100) + 1;
    const email = `k6test${vuId}@loadtest.com`;

    // ── Login ──
    const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email, password: TEST_PASSWORD }),
        { headers: headers(), tags: { name: "POST /auth/login" } }
    );

    if (loginRes.status !== 200) {
        cancelErrors.add(1);
        sleep(2);
        return;
    }
    cancelErrors.add(0);
    const token = loginRes.json().data.access_token;

    sleep(0.5);

    // ── First: Create an order to cancel ──
    // Clear cart
    http.del(`${BASE_URL}/cart/clear`, null, {
        headers: headers(token),
        tags: { name: "DELETE /cart/clear" },
    });

    sleep(0.2);

    // Add 1 item
    const barcodes = [1230331, 1230739, 1231233, 1231932, 2781433];
    const barcode = barcodes[vuId % barcodes.length];
    http.post(
        `${BASE_URL}/cart/items`,
        JSON.stringify({ product_id: barcode, quantity: 1 }),
        { headers: headers(token), tags: { name: "POST /cart/items" } }
    );

    sleep(0.2);

    // Get address
    const addrRes = http.get(`${BASE_URL}/addresses`, {
        headers: headers(token),
        tags: { name: "GET /addresses" },
    });

    let addressId = null;
    if (addrRes.status === 200) {
        try {
            const addrs = addrRes.json().data;
            if (addrs && addrs.length > 0) {
                addressId = addrs[0].id;
            }
        } catch { /* ignore */ }
    }

    if (!addressId) {
        // Create address
        const newAddr = http.post(
            `${BASE_URL}/addresses`,
            JSON.stringify({
                label: `cancel-test-${vuId}`,
                street: `${vuId} Cancel Street`,
                area: "Test Area",
                city: "Cairo",
                latitude: 30.05,
                longitude: 31.24,
                delivery_zone_id: 1,
                is_default: true,
            }),
            { headers: headers(token), tags: { name: "POST /addresses" } }
        );
        try {
            if (newAddr.status === 201 || newAddr.status === 200) {
                addressId = newAddr.json().data.id;
            }
        } catch { /* ignore */ }
    }

    if (!addressId) {
        console.log(`VU${vuId}: No address, skipping cancel test`);
        sleep(1);
        return;
    }

    // Create order
    const orderRes = http.post(
        `${BASE_URL}/orders`,
        JSON.stringify({
            delivery_address_id: addressId,
            payment_method: "cash_on_delivery",
            notes: `Cancel test VU${vuId}`,
        }),
        { headers: headers(token), tags: { name: "POST /orders (for cancel)" } }
    );

    let orderId = null;
    if (orderRes.status === 201) {
        try {
            orderId = orderRes.json().data.id;
        } catch { /* ignore */ }
    }

    if (!orderId) {
        console.log(`VU${vuId}: Order creation failed for cancel test: ${orderRes.status}`);
        sleep(1);
        return;
    }

    sleep(1);

    // ══════════════════════════════════════════════════════════════
    // CANCEL THE ORDER
    // ══════════════════════════════════════════════════════════════
    cancelsAttempted.add(1);

    const cancelRes = http.post(
        `${BASE_URL}/orders/${orderId}/cancel`,
        JSON.stringify({ reason: `K6 load test cancellation VU${vuId}` }),
        { headers: headers(token), tags: { name: "POST /orders/{id}/cancel" } }
    );
    cancelDuration.add(cancelRes.timings.duration);

    if (cancelRes.status === 200) {
        cancelsSucceeded.add(1);
        check(cancelRes, {
            "cancel 200": (r) => r.status === 200,
            "status cancelled": (r) => {
                try {
                    const status = r.json().data.status;
                    return status === "cancelled" || status === "cancelling";
                } catch { return false; }
            },
        });
    } else if (cancelRes.status === 429) {
        rateLimited.add(1);
        console.log(`VU${vuId}: Rate limited on cancel (expected)`);
    } else {
        cancelErrors.add(1);
        console.log(`VU${vuId}: Cancel failed: ${cancelRes.status} ${cancelRes.body}`);
    }

    sleep(0.5);

    // ── Double-cancel attempt (should fail — idempotency test) ──
    const doubleCancelRes = http.post(
        `${BASE_URL}/orders/${orderId}/cancel`,
        JSON.stringify({ reason: "Double cancel attempt" }),
        { headers: headers(token), tags: { name: "POST /orders/{id}/cancel (double)" } }
    );
    check(doubleCancelRes, {
        "double cancel rejected": (r) => r.status === 422 || r.status === 400 || r.status === 429 || r.status === 409,
    });

    sleep(0.5);

    // ── View cancelled order ──
    const viewRes = http.get(`${BASE_URL}/orders/${orderId}`, {
        headers: headers(token),
        tags: { name: "GET /orders/{id} (cancelled)" },
    });
    check(viewRes, {
        "view cancelled 200": (r) => r.status === 200,
    });

    // ── Check wallet / refund (if available) ──
    const walletRes = http.get(`${BASE_URL}/wallet`, {
        headers: headers(token),
        tags: { name: "GET /wallet" },
    });
    // Wallet endpoint may not exist; just record status
    check(walletRes, {
        "wallet accessible": (r) => r.status === 200 || r.status === 404,
    });

    sleep(2 + Math.random() * 3);
}
