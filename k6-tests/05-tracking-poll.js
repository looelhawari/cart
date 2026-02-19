/**
 * k6 Test 05 — Order Tracking Polling Storm
 *
 * Simulates 50 users repeatedly polling their order tracking endpoints.
 * This tests sustained database read load on orders + tracking tables.
 *
 * Run: k6 run k6-tests/05-tracking-poll.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE_URL = "http://localhost:8000/api/v1";
const TEST_PASSWORD = "Test@12345";

const trackDuration = new Trend("track_poll_duration", true);
const orderListDuration = new Trend("order_list_duration", true);
const trackErrors = new Rate("track_errors");

export const options = {
    scenarios: {
        tracking_poll: {
            executor: "constant-vus",
            vus: 50,
            duration: "2m",
        },
    },
    thresholds: {
        "track_poll_duration": ["p(95)<2000", "p(99)<4000"],
        "order_list_duration": ["p(95)<2000"],
        "track_errors": ["rate<0.1"],
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

    // ── Login ──
    const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email, password: TEST_PASSWORD }),
        { headers: headers(), tags: { name: "POST /auth/login" } }
    );

    if (loginRes.status !== 200) {
        trackErrors.add(1);
        sleep(2);
        return;
    }
    trackErrors.add(0);
    const token = loginRes.json().data.access_token;

    sleep(0.3);

    // ── Get user's orders ──
    const ordersRes = http.get(`${BASE_URL}/orders`, {
        headers: headers(token),
        tags: { name: "GET /orders" },
    });
    orderListDuration.add(ordersRes.timings.duration);

    let orderIds = [];
    if (ordersRes.status === 200) {
        try {
            const orders = ordersRes.json().data;
            if (Array.isArray(orders)) {
                orderIds = orders.map((o) => o.id).filter(Boolean);
            } else if (orders && orders.data && Array.isArray(orders.data)) {
                // paginated response
                orderIds = orders.data.map((o) => o.id).filter(Boolean);
            }
        } catch { /* ignore */ }
    }

    if (orderIds.length === 0) {
        // No orders yet, poll the list a few times
        for (let i = 0; i < 5; i++) {
            const listRes = http.get(`${BASE_URL}/orders`, {
                headers: headers(token),
                tags: { name: "GET /orders (poll)" },
            });
            orderListDuration.add(listRes.timings.duration);
            check(listRes, { "orders poll 200": (r) => r.status === 200 });
            sleep(2);
        }
        return;
    }

    // ── Poll tracking for each order (simulate user checking delivery) ──
    const pollCount = Math.min(orderIds.length, 3); // poll up to 3 orders
    for (let cycle = 0; cycle < 3; cycle++) {
        for (let i = 0; i < pollCount; i++) {
            const oid = orderIds[i];

            // Track order
            const trackRes = http.get(`${BASE_URL}/orders/${oid}/tracking`, {
                headers: headers(token),
                tags: { name: "GET /orders/{id}/tracking" },
            });
            trackDuration.add(trackRes.timings.duration);
            check(trackRes, {
                "tracking 200": (r) => r.status === 200,
            });

            sleep(0.5);

            // View order details
            const detailRes = http.get(`${BASE_URL}/orders/${oid}`, {
                headers: headers(token),
                tags: { name: "GET /orders/{id}" },
            });
            check(detailRes, {
                "order detail 200": (r) => r.status === 200,
            });

            sleep(1);
        }

        // Simulate user waiting before re-checking
        sleep(3 + Math.random() * 2);
    }
}
