/**
 * k6 Test 07 — Full User Journey (End-to-End Stress Test)
 *
 * THE ULTIMATE STRESS TEST.
 * 100 concurrent users performing a complete shopping journey:
 *   Login → Browse → Search → Add to Cart → Create Order → Track → (30% Cancel)
 *
 * Duration: 5 minutes sustained at 100 VUs.
 * Uses cash_on_delivery for orders.
 *
 * Run: k6 run k6-tests/07-full-journey.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const BASE_URL = "http://localhost:8000/api/v1";
const TEST_PASSWORD = "Test@12345";

const PRODUCT_BARCODES = [1230331, 1230739, 1231233, 1231932, 2781433, 2783842, 2852724, 2854528, 2886925, 2888224];
const SEARCH_TERMS = ["milk", "bread", "cheese", "juice", "chicken", "rice", "sugar", "water", "oil", "tea"];

// Custom metrics
const loginTime = new Trend("journey_login_ms", true);
const browseTime = new Trend("journey_browse_ms", true);
const searchTime = new Trend("journey_search_ms", true);
const cartTime = new Trend("journey_cart_ms", true);
const orderTime = new Trend("journey_order_ms", true);
const trackTime = new Trend("journey_track_ms", true);
const cancelTime = new Trend("journey_cancel_ms", true);

const journeyErrors = new Rate("journey_errors");
const journeyComplete = new Counter("journey_complete");
const journeyOrdersCreated = new Counter("journey_orders_created");
const journeyOrdersCancelled = new Counter("journey_orders_cancelled");
const journey500Errors = new Counter("journey_500_errors");

export const options = {
    scenarios: {
        full_journey: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: "30s", target: 25 },   // Warm up
                { duration: "30s", target: 50 },   // Ramp
                { duration: "30s", target: 100 },  // Full load
                { duration: "3m", target: 100 },  // Sustained peak
                { duration: "30s", target: 0 },    // Cool down
            ],
        },
    },
    thresholds: {
        "journey_login_ms": ["p(95)<3000"],
        "journey_browse_ms": ["p(95)<2000"],
        "journey_search_ms": ["p(95)<3000"],
        "journey_cart_ms": ["p(95)<2000"],
        "journey_order_ms": ["p(95)<5000"],
        "journey_track_ms": ["p(95)<2000"],
        "journey_errors": ["rate<0.15"],
        "http_req_failed": ["rate<0.15"],
    },
};

function hdrs(token) {
    const h = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "ElBaraka-K6-LoadTest",
    };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
}

function track500(res) {
    if (res.status >= 500) {
        journey500Errors.add(1);
    }
}

export default function () {
    const vuId = (__VU % 100) + 1;
    const email = `k6test${vuId}@loadtest.com`;
    const tag = `VU${vuId}-I${__ITER}`;

    // ──────────────────────────────────────────────────────────────
    //  PHASE 1: LOGIN
    // ──────────────────────────────────────────────────────────────
    let token;
    {
        const res = http.post(
            `${BASE_URL}/auth/login`,
            JSON.stringify({ email, password: TEST_PASSWORD }),
            { headers: hdrs(), tags: { name: "login" } }
        );
        loginTime.add(res.timings.duration);
        track500(res);

        if (res.status !== 200) {
            journeyErrors.add(1);
            console.log(`[${tag}] Login FAIL: ${res.status}`);
            sleep(3);
            return;
        }
        journeyErrors.add(0);
        token = res.json().data.access_token;
    }

    sleep(0.5 + Math.random() * 0.5);

    // ──────────────────────────────────────────────────────────────
    //  PHASE 2: BROWSE PRODUCTS
    // ──────────────────────────────────────────────────────────────
    {
        const res = http.get(`${BASE_URL}/products?per_page=20`, {
            headers: hdrs(token),
            tags: { name: "browse" },
        });
        browseTime.add(res.timings.duration);
        track500(res);
        check(res, { "browse 200": (r) => r.status === 200 });
    }

    sleep(0.3);

    // ──────────────────────────────────────────────────────────────
    //  PHASE 3: BROWSE CATEGORIES
    // ──────────────────────────────────────────────────────────────
    {
        const res = http.get(`${BASE_URL}/categories`, {
            headers: hdrs(token),
            tags: { name: "categories" },
        });
        browseTime.add(res.timings.duration);
        track500(res);
        check(res, { "categories 200": (r) => r.status === 200 });
    }

    sleep(0.3);

    // ──────────────────────────────────────────────────────────────
    //  PHASE 4: SEARCH
    // ──────────────────────────────────────────────────────────────
    {
        const term = SEARCH_TERMS[vuId % SEARCH_TERMS.length];
        const res = http.get(`${BASE_URL}/products/search?q=${term}`, {
            headers: hdrs(token),
            tags: { name: "search" },
        });
        searchTime.add(res.timings.duration);
        track500(res);
        check(res, { "search 200": (r) => r.status === 200 });
    }

    sleep(0.5 + Math.random() * 0.5);

    // ──────────────────────────────────────────────────────────────
    //  PHASE 5: VIEW PRODUCT DETAIL
    // ──────────────────────────────────────────────────────────────
    {
        const barcode = PRODUCT_BARCODES[vuId % PRODUCT_BARCODES.length];
        const res = http.get(`${BASE_URL}/products/${barcode}`, {
            headers: hdrs(token),
            tags: { name: "product-detail" },
        });
        browseTime.add(res.timings.duration);
        track500(res);
        check(res, { "product detail 200": (r) => r.status === 200 });
    }

    sleep(0.3);

    // ──────────────────────────────────────────────────────────────
    //  PHASE 6: CLEAR CART & ADD ITEMS
    // ──────────────────────────────────────────────────────────────
    http.del(`${BASE_URL}/cart/clear`, null, {
        headers: hdrs(token),
        tags: { name: "cart-clear" },
    });

    sleep(0.2);

    const numItems = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numItems; i++) {
        const barcode = PRODUCT_BARCODES[(vuId + i * 3) % PRODUCT_BARCODES.length];
        const res = http.post(
            `${BASE_URL}/cart/items`,
            JSON.stringify({ product_id: barcode, quantity: Math.floor(Math.random() * 2) + 1 }),
            { headers: hdrs(token), tags: { name: "cart-add" } }
        );
        cartTime.add(res.timings.duration);
        track500(res);
        sleep(0.2);
    }

    sleep(0.3);

    // ──────────────────────────────────────────────────────────────
    //  PHASE 7: VIEW CART
    // ──────────────────────────────────────────────────────────────
    {
        const res = http.get(`${BASE_URL}/cart`, {
            headers: hdrs(token),
            tags: { name: "cart-view" },
        });
        cartTime.add(res.timings.duration);
        track500(res);
        check(res, { "cart 200": (r) => r.status === 200 });
    }

    sleep(0.5);

    // ──────────────────────────────────────────────────────────────
    //  PHASE 8: GET/CREATE ADDRESS
    // ──────────────────────────────────────────────────────────────
    let addressId = null;
    {
        const res = http.get(`${BASE_URL}/addresses`, {
            headers: hdrs(token),
            tags: { name: "addresses" },
        });
        track500(res);

        if (res.status === 200) {
            try {
                const addrs = res.json().data;
                if (addrs && addrs.length > 0) addressId = addrs[0].id;
            } catch { /* ignore */ }
        }

        if (!addressId) {
            const create = http.post(
                `${BASE_URL}/addresses`,
                JSON.stringify({
                    label: `journey-${vuId}`,
                    street: `${vuId} Journey St`,
                    area: "K6 Area",
                    city: "Cairo",
                    latitude: 30.04 + Math.random() * 0.02,
                    longitude: 31.23 + Math.random() * 0.02,
                    delivery_zone_id: (vuId % 3) + 1,
                    is_default: true,
                }),
                { headers: hdrs(token), tags: { name: "address-create" } }
            );
            track500(create);
            try {
                if (create.status === 201 || create.status === 200) {
                    addressId = create.json().data.id;
                }
            } catch { /* ignore */ }
        }
    }

    if (!addressId) {
        journeyErrors.add(1);
        console.log(`[${tag}] No address, aborting order`);
        sleep(2);
        return;
    }

    sleep(0.3);

    // ──────────────────────────────────────────────────────────────
    //  PHASE 9: CREATE ORDER
    // ──────────────────────────────────────────────────────────────
    let orderId = null;
    {
        const res = http.post(
            `${BASE_URL}/orders`,
            JSON.stringify({
                delivery_address_id: addressId,
                payment_method: "cash_on_delivery",
                notes: `Journey test ${tag}`,
            }),
            { headers: hdrs(token), tags: { name: "order-create" } }
        );
        orderTime.add(res.timings.duration);
        track500(res);

        if (res.status === 201) {
            try {
                orderId = res.json().data.id;
                journeyOrdersCreated.add(1);
            } catch { /* ignore */ }
        } else {
            journeyErrors.add(1);
            console.log(`[${tag}] Order FAIL: ${res.status} ${res.body}`);
        }
    }

    if (!orderId) {
        sleep(2);
        return;
    }

    sleep(1);

    // ──────────────────────────────────────────────────────────────
    //  PHASE 10: TRACK ORDER (poll 3 times)
    // ──────────────────────────────────────────────────────────────
    for (let p = 0; p < 3; p++) {
        const res = http.get(`${BASE_URL}/orders/${orderId}/tracking`, {
            headers: hdrs(token),
            tags: { name: "track" },
        });
        trackTime.add(res.timings.duration);
        track500(res);
        check(res, { "track 200": (r) => r.status === 200 });
        sleep(1);
    }

    // ──────────────────────────────────────────────────────────────
    //  PHASE 11: CANCEL ORDER (30% probability)
    // ──────────────────────────────────────────────────────────────
    if (Math.random() < 0.3) {
        const res = http.post(
            `${BASE_URL}/orders/${orderId}/cancel`,
            JSON.stringify({ reason: `Journey cancel ${tag}` }),
            { headers: hdrs(token), tags: { name: "cancel" } }
        );
        cancelTime.add(res.timings.duration);
        track500(res);

        if (res.status === 200) {
            journeyOrdersCancelled.add(1);
        }
        check(res, {
            "cancel ok or rate limited": (r) => r.status === 200 || r.status === 429,
        });

        sleep(0.5);
    }

    // ──────────────────────────────────────────────────────────────
    //  PHASE 12: VIEW ORDER HISTORY
    // ──────────────────────────────────────────────────────────────
    {
        const res = http.get(`${BASE_URL}/orders`, {
            headers: hdrs(token),
            tags: { name: "order-history" },
        });
        track500(res);
        check(res, { "history 200": (r) => r.status === 200 });
    }

    journeyComplete.add(1);
    sleep(1 + Math.random() * 2);
}
