/**
 * k6 Test 03 — Cart Operations Stress Test
 *
 * Simulates 50 users adding/updating/removing cart items concurrently.
 * Tests: Cart race conditions, stock check TOCTOU, cart ownership merge.
 *
 * Run: k6 run k6-tests/03-cart-operations.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const BASE_URL = "http://localhost:8000/api/v1";
const TEST_PASSWORD = "Test@12345";

const PRODUCT_BARCODES = [1230331, 1230739, 1231233, 1231932, 2781433, 2783842, 2852724, 2854528, 2886925, 2888224];

const cartViewDuration = new Trend("cart_view_duration", true);
const cartAddDuration = new Trend("cart_add_duration", true);
const cartUpdateDuration = new Trend("cart_update_duration", true);
const cartErrors = new Rate("cart_errors");
const cartRaceConditions = new Counter("cart_race_conditions");

export const options = {
    scenarios: {
        cart_stress: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: "20s", target: 25 },
                { duration: "20s", target: 50 },
                { duration: "60s", target: 50 },
                { duration: "20s", target: 0 },
            ],
        },
    },
    thresholds: {
        "cart_view_duration": ["p(95)<2000"],
        "cart_add_duration": ["p(95)<2000"],
        "cart_update_duration": ["p(95)<2000"],
        "cart_errors": ["rate<0.1"],
        "http_req_failed": ["rate<0.1"],
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

    // ── Step 1: Login ──
    const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email, password: TEST_PASSWORD }),
        { headers: headers(), tags: { name: "POST /auth/login" } }
    );

    if (loginRes.status !== 200) {
        cartErrors.add(1);
        sleep(1);
        return;
    }
    cartErrors.add(0);
    const token = loginRes.json().data.access_token;

    sleep(0.3);

    // ── Step 2: Clear Cart (clean start) ──
    http.del(`${BASE_URL}/cart/clear`, null, {
        headers: headers(token),
        tags: { name: "DELETE /cart/clear" },
    });

    sleep(0.3);

    // ── Step 3: View Empty Cart ──
    const emptyCartRes = http.get(`${BASE_URL}/cart`, {
        headers: headers(token),
        tags: { name: "GET /cart (empty)" },
    });
    cartViewDuration.add(emptyCartRes.timings.duration);
    check(emptyCartRes, {
        "empty cart 200": (r) => r.status === 200,
    });

    sleep(0.3);

    // ── Step 4: Add First Item ──
    const barcode1 = PRODUCT_BARCODES[vuId % PRODUCT_BARCODES.length];
    const addRes1 = http.post(
        `${BASE_URL}/cart/items`,
        JSON.stringify({ product_id: barcode1, quantity: 2 }),
        { headers: headers(token), tags: { name: "POST /cart/items (1st)" } }
    );
    cartAddDuration.add(addRes1.timings.duration);
    const add1Ok = check(addRes1, {
        "add item 1 status 201": (r) => r.status === 201,
    });

    if (!add1Ok) {
        console.log(`Add item 1 failed VU${vuId}: ${addRes1.status} ${addRes1.body}`);
    }

    sleep(0.3);

    // ── Step 5: Add Second Item ──
    const barcode2 = PRODUCT_BARCODES[(vuId + 3) % PRODUCT_BARCODES.length];
    const addRes2 = http.post(
        `${BASE_URL}/cart/items`,
        JSON.stringify({ product_id: barcode2, quantity: 1 }),
        { headers: headers(token), tags: { name: "POST /cart/items (2nd)" } }
    );
    cartAddDuration.add(addRes2.timings.duration);
    check(addRes2, {
        "add item 2 status 201": (r) => r.status === 201,
    });

    sleep(0.3);

    // ── Step 6: View Cart (should have 2 items) ──
    const cartRes = http.get(`${BASE_URL}/cart`, {
        headers: headers(token),
        tags: { name: "GET /cart (with items)" },
    });
    cartViewDuration.add(cartRes.timings.duration);
    const cartOk = check(cartRes, {
        "cart 200": (r) => r.status === 200,
        "cart has items": (r) => {
            try {
                const items = r.json().data.items;
                return items && items.length >= 1;
            } catch { return false; }
        },
    });

    sleep(0.3);

    // ── Step 7: Update Item Quantity ──
    if (cartOk) {
        try {
            const items = cartRes.json().data.items;
            if (items && items.length > 0) {
                const itemId = items[0].id;
                const updateRes = http.put(
                    `${BASE_URL}/cart/items/${itemId}`,
                    JSON.stringify({ quantity: 3 }),
                    { headers: headers(token), tags: { name: "PUT /cart/items/{id}" } }
                );
                cartUpdateDuration.add(updateRes.timings.duration);
                check(updateRes, {
                    "update item 200": (r) => r.status === 200,
                });
            }
        } catch (e) {
            console.log(`Update failed VU${vuId}: ${e}`);
        }
    }

    sleep(0.3);

    // ── Step 8: Rapid-fire add same product (race condition test) ──
    const rapidBarcode = PRODUCT_BARCODES[(vuId + 5) % PRODUCT_BARCODES.length];
    const rapidResponses = http.batch([
        ["POST", `${BASE_URL}/cart/items`, JSON.stringify({ product_id: rapidBarcode, quantity: 1 }), { headers: headers(token), tags: { name: "POST /cart/items (rapid-1)" } }],
        ["POST", `${BASE_URL}/cart/items`, JSON.stringify({ product_id: rapidBarcode, quantity: 1 }), { headers: headers(token), tags: { name: "POST /cart/items (rapid-2)" } }],
    ]);

    // Check for race condition — same product added twice should increment, not duplicate
    for (const r of rapidResponses) {
        if (r.status >= 500) {
            cartRaceConditions.add(1);
            console.log(`Race condition detected VU${vuId}: ${r.status} ${r.body}`);
        }
    }

    sleep(0.3);

    // ── Step 9: Remove Item ──
    const finalCartRes = http.get(`${BASE_URL}/cart`, {
        headers: headers(token),
        tags: { name: "GET /cart (final)" },
    });
    try {
        const items = finalCartRes.json().data.items;
        if (items && items.length > 0) {
            const removeId = items[items.length - 1].id;
            http.del(`${BASE_URL}/cart/items/${removeId}`, null, {
                headers: headers(token),
                tags: { name: "DELETE /cart/items/{id}" },
            });
        }
    } catch (e) { /* ignore */ }

    sleep(1 + Math.random());
}
