/**
 * k6 Test 02 — Browse Catalog
 *
 * Simulates 100 users browsing products, categories, searching.
 * Tests: MySQL queries, product caching (5min), FULLTEXT search, N+1 risks.
 *
 * Run: k6 run k6-tests/02-browse-catalog.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE_URL = "http://localhost:8000/api/v1";

const PRODUCT_BARCODES = [1230331, 1230739, 1231233, 1231932, 2781433, 2783842, 2852724, 2854528, 2886925, 2888224];
const SEARCH_TERMS = ["milk", "cheese", "bread", "water", "juice", "chocolate", "rice", "chicken", "tomato", "sugar"];
const CATEGORY_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SORT_OPTIONS = ["price", "rating", "name_en", "popularity", "created_at", "sales_count"];

const listDuration = new Trend("product_list_duration", true);
const searchDuration = new Trend("search_duration", true);
const detailDuration = new Trend("product_detail_duration", true);
const categoryDuration = new Trend("category_duration", true);
const browseErrors = new Rate("browse_errors");

export const options = {
    scenarios: {
        browse: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: "30s", target: 50 },
                { duration: "30s", target: 100 },
                { duration: "60s", target: 100 },
                { duration: "30s", target: 0 },
            ],
        },
    },
    thresholds: {
        "product_list_duration": ["p(95)<2000"],
        "search_duration": ["p(95)<3000"],
        "product_detail_duration": ["p(95)<1500"],
        "category_duration": ["p(95)<2000"],
        "browse_errors": ["rate<0.05"],
        "http_req_failed": ["rate<0.05"],
    },
};

const defaultHeaders = {
    "Accept": "application/json",
    "User-Agent": "ElBaraka-K6-LoadTest",
};

export default function () {
    // ── Step 1: Featured Products ──
    const featuredRes = http.get(`${BASE_URL}/products/featured`, {
        headers: defaultHeaders,
        tags: { name: "GET /products/featured" },
    });
    listDuration.add(featuredRes.timings.duration);
    const ok1 = check(featuredRes, {
        "featured 200": (r) => r.status === 200,
        "featured has products": (r) => {
            try { return Array.isArray(r.json().data.products); } catch { return false; }
        },
    });
    if (!ok1) browseErrors.add(1); else browseErrors.add(0);

    sleep(0.5);

    // ── Step 2: Product List (paginated, sorted) ──
    const sort = SORT_OPTIONS[Math.floor(Math.random() * SORT_OPTIONS.length)];
    const page = Math.floor(Math.random() * 5) + 1;
    const listRes = http.get(`${BASE_URL}/products?per_page=20&page=${page}&sort_by=${sort}&sort_order=asc`, {
        headers: defaultHeaders,
        tags: { name: "GET /products (list)" },
    });
    listDuration.add(listRes.timings.duration);
    check(listRes, {
        "product list 200": (r) => r.status === 200,
    });

    sleep(0.3);

    // ── Step 3: Search ──
    const searchTerm = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
    const searchRes = http.get(`${BASE_URL}/products?search=${searchTerm}&per_page=20`, {
        headers: defaultHeaders,
        tags: { name: "GET /products (search)" },
    });
    searchDuration.add(searchRes.timings.duration);
    check(searchRes, {
        "search 200": (r) => r.status === 200,
    });

    sleep(0.3);

    // ── Step 4: Categories ──
    const catRes = http.get(`${BASE_URL}/categories`, {
        headers: defaultHeaders,
        tags: { name: "GET /categories" },
    });
    categoryDuration.add(catRes.timings.duration);
    check(catRes, {
        "categories 200": (r) => r.status === 200,
    });

    sleep(0.3);

    // ── Step 5: Category Products ──
    const catId = CATEGORY_IDS[Math.floor(Math.random() * CATEGORY_IDS.length)];
    const catProductsRes = http.get(`${BASE_URL}/categories/${catId}/products`, {
        headers: defaultHeaders,
        tags: { name: "GET /categories/{id}/products" },
    });
    categoryDuration.add(catProductsRes.timings.duration);
    check(catProductsRes, {
        "category products 200 or 404": (r) => r.status === 200 || r.status === 404,
    });

    sleep(0.3);

    // ── Step 6: Featured with products ──
    const featWithRes = http.get(`${BASE_URL}/categories/featured-with-products`, {
        headers: defaultHeaders,
        tags: { name: "GET /categories/featured-with-products" },
    });
    categoryDuration.add(featWithRes.timings.duration);
    check(featWithRes, {
        "featured-with-products 200": (r) => r.status === 200,
    });

    sleep(0.3);

    // ── Step 7: Single Product Detail ──
    const barcode = PRODUCT_BARCODES[Math.floor(Math.random() * PRODUCT_BARCODES.length)];
    const detailRes = http.get(`${BASE_URL}/products/${barcode}`, {
        headers: defaultHeaders,
        tags: { name: "GET /products/{barcode}" },
    });
    detailDuration.add(detailRes.timings.duration);
    check(detailRes, {
        "product detail 200": (r) => r.status === 200,
        "product has barcode": (r) => {
            try { return r.json().data.product.barcode !== undefined; } catch { return false; }
        },
    });

    sleep(1 + Math.random() * 2);
}
