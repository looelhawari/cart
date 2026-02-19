/**
 * k6 Test 04 — Full Order Flow (CRITICAL)
 *
 * The most important test: simulates 100 users completing a full purchase.
 * Login → Browse → Add to Cart → Get Addresses → Create Order → Confirm.
 * Uses cash_on_delivery to avoid Paymob gateway dependency.
 *
 * Tests: lockForUpdate on products, stock decrement race, concurrent order creation.
 *
 * Run: k6 run k6-tests/04-full-order-flow.js
 */

import http from "k6/http";
import { check, sleep, fail } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const BASE_URL = "http://localhost:8000/api/v1";
const TEST_PASSWORD = "Test@12345";

const PRODUCT_BARCODES = [1230331, 1230739, 1231233, 1231932, 2781433, 2783842, 2852724, 2854528, 2886925, 2888224];

const loginDuration = new Trend("login_duration", true);
const addToCartDuration = new Trend("add_to_cart_duration", true);
const orderCreateDuration = new Trend("order_create_duration", true);
const orderViewDuration = new Trend("order_view_duration", true);
const orderErrors = new Rate("order_errors");
const ordersCreated = new Counter("orders_created");
const stockErrors = new Counter("stock_errors");

export const options = {
    scenarios: {
        order_rush: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: "15s", target: 25 },
                { duration: "15s", target: 50 },
                { duration: "15s", target: 100 },
                { duration: "60s", target: 100 },  // 100 concurrent orders
                { duration: "15s", target: 0 },
            ],
        },
    },
    thresholds: {
        "login_duration": ["p(95)<3000"],
        "add_to_cart_duration": ["p(95)<3000"],
        "order_create_duration": ["p(95)<5000"],
        "order_view_duration": ["p(95)<3000"],
        "order_errors": ["rate<0.15"],
        "http_req_failed": ["rate<0.15"],
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
    const iterationId = `${vuId}-${__ITER}`;

    // ══════════════════════════════════════════════════════════════
    // Phase 1: LOGIN
    // ══════════════════════════════════════════════════════════════
    const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email, password: TEST_PASSWORD }),
        { headers: headers(), tags: { name: "POST /auth/login" } }
    );
    loginDuration.add(loginRes.timings.duration);

    if (loginRes.status !== 200) {
        orderErrors.add(1);
        console.log(`[${iterationId}] Login failed: ${loginRes.status}`);
        sleep(2);
        return;
    }
    orderErrors.add(0);
    const token = loginRes.json().data.access_token;

    sleep(0.5);

    // ══════════════════════════════════════════════════════════════
    // Phase 2: CLEAR CART (clean state)
    // ══════════════════════════════════════════════════════════════
    http.del(`${BASE_URL}/cart/clear`, null, {
        headers: headers(token),
        tags: { name: "DELETE /cart/clear" },
    });

    sleep(0.3);

    // ══════════════════════════════════════════════════════════════
    // Phase 3: ADD ITEMS TO CART
    // ══════════════════════════════════════════════════════════════
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
    for (let i = 0; i < numItems; i++) {
        const barcode = PRODUCT_BARCODES[(vuId + i) % PRODUCT_BARCODES.length];
        const qty = Math.floor(Math.random() * 2) + 1; // 1-2 quantity

        const addRes = http.post(
            `${BASE_URL}/cart/items`,
            JSON.stringify({ product_id: barcode, quantity: qty }),
            { headers: headers(token), tags: { name: "POST /cart/items" } }
        );
        addToCartDuration.add(addRes.timings.duration);

        const addOk = check(addRes, {
            "add to cart ok": (r) => r.status === 200 || r.status === 201,
        });

        if (!addOk) {
            if (addRes.body && addRes.body.includes("stock")) {
                stockErrors.add(1);
                console.log(`[${iterationId}] Stock issue for barcode ${barcode}: ${addRes.body}`);
            }
        }

        sleep(0.2);
    }

    sleep(0.3);

    // ══════════════════════════════════════════════════════════════
    // Phase 4: GET DELIVERY ADDRESSES
    // ══════════════════════════════════════════════════════════════
    const addrRes = http.get(`${BASE_URL}/addresses`, {
        headers: headers(token),
        tags: { name: "GET /addresses" },
    });

    let addressId = null;
    if (addrRes.status === 200) {
        try {
            const addresses = addrRes.json().data;
            if (addresses && addresses.length > 0) {
                addressId = addresses[0].id;
            }
        } catch { /* ignore */ }
    }

    // If user has no address, create one
    if (!addressId) {
        const createAddrRes = http.post(
            `${BASE_URL}/addresses`,
            JSON.stringify({
                label: `k6-test-addr-${vuId}`,
                street: `${vuId} Test Street`,
                area: "Test Area",
                city: "Cairo",
                latitude: 30.0444 + (Math.random() * 0.01),
                longitude: 31.2357 + (Math.random() * 0.01),
                delivery_zone_id: (vuId % 3) + 1,
                is_default: true,
            }),
            { headers: headers(token), tags: { name: "POST /addresses" } }
        );

        if (createAddrRes.status === 201 || createAddrRes.status === 200) {
            try {
                addressId = createAddrRes.json().data.id;
            } catch { /* ignore */ }
        }
    }

    if (!addressId) {
        orderErrors.add(1);
        console.log(`[${iterationId}] No address available, skipping order`);
        sleep(1);
        return;
    }

    sleep(0.3);

    // ══════════════════════════════════════════════════════════════
    // Phase 5: VIEW CART SUMMARY
    // ══════════════════════════════════════════════════════════════
    const cartSummary = http.get(`${BASE_URL}/cart`, {
        headers: headers(token),
        tags: { name: "GET /cart (pre-order)" },
    });
    check(cartSummary, {
        "cart summary 200": (r) => r.status === 200,
        "cart has items for order": (r) => {
            try {
                const items = r.json().data.items;
                return items && items.length > 0;
            } catch { return false; }
        },
    });

    sleep(0.5);

    // ══════════════════════════════════════════════════════════════
    // Phase 6: CREATE ORDER (THE CRITICAL MOMENT)
    // ══════════════════════════════════════════════════════════════
    const orderBody = {
        delivery_address_id: addressId,
        payment_method: "cash_on_delivery",
        notes: `K6 load test order - VU ${vuId} iter ${__ITER}`,
    };

    const orderRes = http.post(
        `${BASE_URL}/orders`,
        JSON.stringify(orderBody),
        { headers: headers(token), tags: { name: "POST /orders (CREATE)" } }
    );
    orderCreateDuration.add(orderRes.timings.duration);

    const orderOk = check(orderRes, {
        "order created 201": (r) => r.status === 201,
        "order has id": (r) => {
            try { return !!r.json().data.id; } catch { return false; }
        },
    });

    let orderId = null;
    if (orderOk) {
        ordersCreated.add(1);
        try {
            orderId = orderRes.json().data.id;
            console.log(`[${iterationId}] Order #${orderId} created successfully`);
        } catch { /* ignore */ }
    } else {
        orderErrors.add(1);
        console.log(`[${iterationId}] Order creation FAILED: ${orderRes.status} ${orderRes.body}`);
        sleep(1);
        return;
    }

    sleep(0.5);

    // ══════════════════════════════════════════════════════════════
    // Phase 7: VIEW ORDER DETAILS
    // ══════════════════════════════════════════════════════════════
    if (orderId) {
        const viewRes = http.get(`${BASE_URL}/orders/${orderId}`, {
            headers: headers(token),
            tags: { name: "GET /orders/{id}" },
        });
        orderViewDuration.add(viewRes.timings.duration);
        check(viewRes, {
            "view order 200": (r) => r.status === 200,
            "order status is pending": (r) => {
                try { return r.json().data.status === "pending"; } catch { return false; }
            },
        });

        sleep(0.3);

        // ══════════════════════════════════════════════════════════
        // Phase 8: TRACK ORDER
        // ══════════════════════════════════════════════════════════
        const trackRes = http.get(`${BASE_URL}/orders/${orderId}/tracking`, {
            headers: headers(token),
            tags: { name: "GET /orders/{id}/tracking" },
        });
        check(trackRes, {
            "tracking 200": (r) => r.status === 200,
        });

        sleep(0.3);

        // ══════════════════════════════════════════════════════════
        // Phase 9: LIST ORDERS
        // ══════════════════════════════════════════════════════════
        const listRes = http.get(`${BASE_URL}/orders`, {
            headers: headers(token),
            tags: { name: "GET /orders (list)" },
        });
        check(listRes, {
            "orders list 200": (r) => r.status === 200,
        });
    }

    sleep(1 + Math.random() * 2);
}
