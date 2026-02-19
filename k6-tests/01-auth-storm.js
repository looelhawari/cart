/**
 * k6 Test 01 — Auth Login Storm
 *
 * Simulates 100 concurrent users logging in simultaneously.
 * Tests: bcrypt CPU load, token generation, DB writes, rate limiting.
 *
 * Run: k6 run k6-tests/01-auth-storm.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = "http://localhost:8000/api/v1";
const TEST_PASSWORD = "Test@12345";

const loginDuration = new Trend("login_duration", true);
const profileDuration = new Trend("profile_duration", true);
const refreshDuration = new Trend("refresh_duration", true);
const loginErrors = new Rate("login_errors");

export const options = {
    scenarios: {
        login_storm: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: "30s", target: 50 },   // Ramp to 50
                { duration: "30s", target: 100 },  // Ramp to 100
                { duration: "60s", target: 100 },  // Sustain 100
                { duration: "30s", target: 0 },    // Ramp down
            ],
        },
    },
    thresholds: {
        "login_duration": ["p(95)<3000"],
        "profile_duration": ["p(95)<2000"],
        "login_errors": ["rate<0.1"],
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

    // ── Step 1: Login ──
    const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email, password: TEST_PASSWORD }),
        { headers: headers(), tags: { name: "POST /auth/login" } }
    );

    loginDuration.add(loginRes.timings.duration);

    const loginOk = check(loginRes, {
        "login status 200": (r) => r.status === 200,
        "login has token": (r) => {
            try { return r.json().data.access_token !== undefined; } catch { return false; }
        },
    });

    if (!loginOk) {
        loginErrors.add(1);
        console.log(`Login failed VU${vuId}: ${loginRes.status} ${loginRes.body}`);
        sleep(1);
        return;
    }
    loginErrors.add(0);

    const data = loginRes.json().data;
    const token = data.access_token;
    const refreshToken = data.refresh_token;

    sleep(0.5);

    // ── Step 2: Get Profile ──
    const profileRes = http.get(`${BASE_URL}/profile`, {
        headers: headers(token),
        tags: { name: "GET /profile" },
    });
    profileDuration.add(profileRes.timings.duration);

    check(profileRes, {
        "profile status 200": (r) => r.status === 200,
        "profile has user data": (r) => {
            try { return r.json().data.id !== undefined; } catch { return false; }
        },
    });

    sleep(0.5);

    // ── Step 3: Refresh Token ──
    const refreshRes = http.post(
        `${BASE_URL}/auth/refresh`,
        JSON.stringify({ refresh_token: refreshToken }),
        { headers: headers(), tags: { name: "POST /auth/refresh" } }
    );
    refreshDuration.add(refreshRes.timings.duration);

    check(refreshRes, {
        "refresh status 200": (r) => r.status === 200,
        "refresh has new token": (r) => {
            try { return r.json().data.access_token !== undefined; } catch { return false; }
        },
    });

    sleep(1 + Math.random() * 2); // Think time 1-3s
}
