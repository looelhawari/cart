/**
 * k6 Shared Helpers — Config, Headers, Auth, Checks
 */

export const BASE_URL = "https://cartshop.site/api/v1";

// Sample active product barcodes
export const PRODUCT_BARCODES = [
    1230331, 1230739, 1231233, 1231932, 2781433,
    2783842, 2852724, 2854528, 2886925, 2888224,
];

// Common headers for all API requests
export function commonHeaders(token = null) {
    const h = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "ElBaraka-K6-LoadTest",
    };
    if (token) {
        h["Authorization"] = `Bearer ${token}`;
    }
    return h;
}

// Generate test user email for a given VU number
export function testUserEmail(vuId) {
    return `k6test${vuId}@loadtest.com`;
}

export const TEST_PASSWORD = "Test@12345";

// Login and return { token, refreshToken, userId }
export function login(vuId) {
    const email = testUserEmail(vuId);
    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: email,
        password: TEST_PASSWORD,
    }), { headers: commonHeaders() });

    if (res.status === 200) {
        const body = res.json();
        if (body.success && body.data) {
            return {
                token: body.data.access_token,
                refreshToken: body.data.refresh_token,
                userId: body.data.user.id,
            };
        }
    }
    return null;
}

// Pick a random product barcode
export function randomBarcode() {
    return PRODUCT_BARCODES[Math.floor(Math.random() * PRODUCT_BARCODES.length)];
}

// Standard check helper
export function checkResponse(res, name, expectedStatus = 200) {
    const checks = {};
    checks[`${name} status ${expectedStatus}`] = (r) => r.status === expectedStatus;
    checks[`${name} has body`] = (r) => r.body && r.body.length > 0;
    return checks;
}

import http from "k6/http";
