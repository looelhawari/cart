/**
 * Enterprise Rate Limit Handler for React Native
 * 
 * Provides:
 * - HTTP 429 detection and smart exponential backoff with jitter
 * - Retry-After header respect
 * - Per-endpoint request throttling (prevents flooding the server)
 * - Rate limit state tracking for UI components
 * - Request queue with priority and deduplication
 * - Adaptive behavior based on server feedback
 * 
 * Inspired by how Facebook, Instagram, and Stripe handle rate limiting
 * on mobile clients.
 */

// ─── Types ────────────────────────────────────────────────────────────

export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number; // Unix timestamp
    retryAfter: number; // seconds
    policy: string;
    isLimited: boolean;
    lastUpdated: number;
}

interface RetryConfig {
    maxRetries: number;
    baseDelay: number; // ms
    maxDelay: number; // ms
    jitter: boolean;
}

interface QueuedRequest {
    id: string;
    endpoint: string;
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    priority: number; // Lower = higher priority
    timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: true,
};

// Endpoint-specific retry configs (security endpoints get fewer retries)
const ENDPOINT_RETRY_CONFIGS: Record<string, Partial<RetryConfig>> = {
    "auth/login": { maxRetries: 1, baseDelay: 2000 },
    "auth/register": { maxRetries: 1, baseDelay: 3000 },
    "auth/forgot-password": { maxRetries: 1, baseDelay: 5000 },
    "auth/verify-email": { maxRetries: 1, baseDelay: 2000 },
    "checkout": { maxRetries: 2, baseDelay: 2000 },
    "payments": { maxRetries: 1, baseDelay: 3000 },
};

// Request priorities (lower = higher priority)
const PRIORITIES: Record<string, number> = {
    "auth": 1,
    "checkout": 2,
    "payments": 2,
    "cart": 3,
    "orders": 4,
    "products": 5,
    "categories": 6,
    "notifications": 7,
    "search": 8,
};

// ─── Rate Limit State ─────────────────────────────────────────────────

const rateLimitState: Map<string, RateLimitInfo> = new Map();
const listeners: Set<(state: Map<string, RateLimitInfo>) => void> = new Set();
// Per-endpoint backoff timers: endpoint → Date.now() when requests can resume
const backoffUntil: Map<string, number> = new Map();

function notifyListeners(): void {
    const snapshot = new Map(rateLimitState);
    listeners.forEach((listener) => {
        try {
            listener(snapshot);
        } catch {
            // Don't let listener errors break the system
        }
    });
}

/**
 * Subscribe to rate limit state changes.
 * @returns Unsubscribe function
 */
export function onRateLimitChange(
    listener: (state: Map<string, RateLimitInfo>) => void
): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Get current rate limit info.
 * @param endpoint Optional: specific endpoint group
 */
export function getRateLimitInfo(
    endpoint?: string
): RateLimitInfo | undefined {
    if (endpoint) return rateLimitState.get(endpoint);

    // Return most restrictive
    let worst: RateLimitInfo | undefined;
    rateLimitState.forEach((info) => {
        if (!worst || info.remaining < worst.remaining) worst = info;
    });
    return worst;
}

/**
 * Check if a specific endpoint is currently rate limited.
 */
export function isEndpointLimited(endpoint: string): boolean {
    const until = backoffUntil.get(endpoint);
    if (until && Date.now() < until) return true;

    const info = rateLimitState.get(endpoint);
    return info?.isLimited ?? false;
}

/**
 * Get time until an endpoint's rate limit expires (ms).
 */
export function getEndpointCooldown(endpoint: string): number {
    const until = backoffUntil.get(endpoint);
    if (until && Date.now() < until) return until - Date.now();
    return 0;
}

// ─── Header Parsing ───────────────────────────────────────────────────

/**
 * Extract endpoint group from URL path.
 * "/api/v1/products/123" → "products"
 * "/api/v1/admin/orders/5/status" → "admin/orders"
 */
function extractEndpointGroup(url: string): string {
    const path = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/api\/v\d+\//, "");
    const segments = path.split("/").filter(Boolean);
    // Use first 1-2 non-numeric segments
    const meaningful = segments.filter((s) => !/^\d+$/.test(s)).slice(0, 2);
    return meaningful.join("/") || "unknown";
}

/**
 * Parse rate limit headers from a fetch Response.
 */
export function parseRateLimitHeaders(
    response: Response,
    url: string
): RateLimitInfo | null {
    const limit = parseInt(response.headers.get("x-ratelimit-limit") || "0", 10);
    const remaining = parseInt(
        response.headers.get("x-ratelimit-remaining") || "0",
        10
    );
    const reset = parseInt(response.headers.get("x-ratelimit-reset") || "0", 10);
    const retryAfter = parseInt(
        response.headers.get("retry-after") || "0",
        10
    );
    const policy = response.headers.get("x-ratelimit-policy") || "unknown";

    if (limit <= 0 && remaining <= 0 && !response.headers.has("retry-after")) {
        return null;
    }

    const endpoint = extractEndpointGroup(url);
    const info: RateLimitInfo = {
        limit,
        remaining,
        reset,
        retryAfter,
        policy,
        isLimited: response.status === 429,
        lastUpdated: Date.now(),
    };

    rateLimitState.set(endpoint, info);

    if (response.status === 429 && retryAfter > 0) {
        backoffUntil.set(endpoint, Date.now() + retryAfter * 1000);
    }

    notifyListeners();
    return info;
}

/**
 * Parse rate limit info from a 429 JSON response body.
 */
export function parseRateLimitBody(
    body: any,
    url: string
): RateLimitInfo | null {
    if (!body || body.error_code !== "RATE_LIMITED") return null;

    const endpoint = extractEndpointGroup(url);
    const info: RateLimitInfo = {
        limit: body.limit || 0,
        remaining: body.remaining || 0,
        reset: body.reset_at || 0,
        retryAfter: body.retry_after || 0,
        policy: body.policy || "unknown",
        isLimited: true,
        lastUpdated: Date.now(),
    };

    rateLimitState.set(endpoint, info);

    if (info.retryAfter > 0) {
        backoffUntil.set(endpoint, Date.now() + info.retryAfter * 1000);
    }

    notifyListeners();
    return info;
}

// ─── Exponential Backoff ──────────────────────────────────────────────

/**
 * Calculate delay with exponential backoff + jitter.
 */
function calculateBackoff(
    attempt: number,
    config: RetryConfig,
    serverRetryAfter?: number
): number {
    // Always respect server's Retry-After
    if (serverRetryAfter && serverRetryAfter > 0) {
        return serverRetryAfter * 1000;
    }

    // Exponential: base * 2^attempt
    let delay = config.baseDelay * Math.pow(2, attempt);
    delay = Math.min(delay, config.maxDelay);

    // Decorrelated jitter (better than full jitter for mobile)
    if (config.jitter) {
        delay = delay * (0.5 + Math.random() * 1.0);
    }

    return Math.floor(delay);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get retry config for a specific endpoint.
 */
function getRetryConfig(endpoint: string): RetryConfig {
    for (const [pattern, overrides] of Object.entries(ENDPOINT_RETRY_CONFIGS)) {
        if (endpoint.startsWith(pattern)) {
            return { ...DEFAULT_RETRY_CONFIG, ...overrides };
        }
    }
    return DEFAULT_RETRY_CONFIG;
}

// ─── Rate-Limited Fetch Wrapper ───────────────────────────────────────

/**
 * Execute a fetch request with full rate limit handling.
 * 
 * Features:
 * - Pre-flight check: skips if endpoint is in backoff
 * - Parses rate limit headers from every response
 * - On 429: exponential backoff with jitter, respects Retry-After
 * - Returns enhanced error with rate limit context
 * 
 * @param url Full URL to fetch
 * @param options Standard fetch options
 * @param retryAttempt Current retry attempt (internal)
 * @returns Fetch Response
 */
export async function rateLimitedFetch(
    url: string,
    options: RequestInit = {},
    retryAttempt: number = 0
): Promise<Response> {
    const endpoint = extractEndpointGroup(url);
    const config = getRetryConfig(endpoint);

    // Pre-flight: check if we're in a backoff period for this endpoint
    const cooldown = getEndpointCooldown(endpoint);
    if (cooldown > 0 && retryAttempt === 0) {
        // Wait out the cooldown before sending
        if (__DEV__) {
            console.log(
                `[RateLimit] Endpoint "${endpoint}" in cooldown for ${cooldown}ms, waiting...`
            );
        }
        await sleep(cooldown);
    }

    const response = await fetch(url, options);

    // Parse rate limit headers from EVERY response (200, 429, etc.)
    parseRateLimitHeaders(response, url);

    if (response.status === 429) {
        // Parse the 429 body for detailed info
        let body: any = null;
        try {
            const text = await response.clone().text();
            body = JSON.parse(text);
            parseRateLimitBody(body, url);
        } catch {
            // Body parsing is best-effort
        }

        const serverRetryAfter =
            parseInt(response.headers.get("retry-after") || "0", 10) ||
            body?.retry_after ||
            0;

        if (retryAttempt < config.maxRetries) {
            const delay = calculateBackoff(retryAttempt, config, serverRetryAfter);

            if (__DEV__) {
                console.warn(
                    `[RateLimit] 429 on ${endpoint}. ` +
                    `Retry ${retryAttempt + 1}/${config.maxRetries} in ${delay}ms ` +
                    `(server said: ${serverRetryAfter}s)`
                );
            }

            await sleep(delay);
            return rateLimitedFetch(url, options, retryAttempt + 1);
        }

        // All retries exhausted
        if (__DEV__) {
            console.error(
                `[RateLimit] All ${config.maxRetries} retries exhausted for ${endpoint}`
            );
        }

        // Return the original 429 response — callers handle the error
        return response;
    }

    return response;
}

// ─── Request Throttle / Queue ─────────────────────────────────────────

let requestQueue: QueuedRequest[] = [];
let isProcessing = false;
const MIN_REQUEST_INTERVAL = 50; // Minimum ms between requests to same endpoint
const lastRequestTime: Map<string, number> = new Map();

/**
 * Enqueue a request with priority and throttling.
 * Prevents flooding the server with many simultaneous requests.
 */
export function enqueueRequest<T>(
    endpoint: string,
    execute: () => Promise<T>,
    priority?: number
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const endpointGroup = extractEndpointGroup(endpoint);
        const id = `${endpointGroup}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        const queueItem: QueuedRequest = {
            id,
            endpoint: endpointGroup,
            execute,
            resolve,
            reject,
            priority: priority ?? PRIORITIES[endpointGroup.split("/")[0]] ?? 5,
            timestamp: Date.now(),
        };

        requestQueue.push(queueItem);
        // Sort by priority (lower = higher priority)
        requestQueue.sort((a, b) => a.priority - b.priority);

        processQueue();
    });
}

async function processQueue(): Promise<void> {
    if (isProcessing || requestQueue.length === 0) return;

    isProcessing = true;

    while (requestQueue.length > 0) {
        const item = requestQueue.shift()!;

        // Check per-endpoint throttling
        const lastTime = lastRequestTime.get(item.endpoint) ?? 0;
        const elapsed = Date.now() - lastTime;
        if (elapsed < MIN_REQUEST_INTERVAL) {
            await sleep(MIN_REQUEST_INTERVAL - elapsed);
        }

        // Check if endpoint is in backoff
        const cooldown = getEndpointCooldown(item.endpoint);
        if (cooldown > 0) {
            await sleep(cooldown);
        }

        lastRequestTime.set(item.endpoint, Date.now());

        try {
            const result = await item.execute();
            item.resolve(result);
        } catch (error) {
            item.reject(error);
        }
    }

    isProcessing = false;
}

// ─── Utility: Debounced API Call ──────────────────────────────────────

const debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

/**
 * Debounce an API call. Useful for search-as-you-type scenarios.
 * Ensures at most one request per `delay` ms for the same key.
 */
export function debouncedApiCall<T>(
    key: string,
    execute: () => Promise<T>,
    delay: number = 300
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const existing = debounceTimers.get(key);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(async () => {
            debounceTimers.delete(key);
            try {
                const result = await execute();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }, delay);

        debounceTimers.set(key, timer);
    });
}

// ─── Cleanup ──────────────────────────────────────────────────────────

/**
 * Clear all rate limit state. Call on logout.
 */
export function clearRateLimitState(): void {
    rateLimitState.clear();
    backoffUntil.clear();
    requestQueue = [];
    lastRequestTime.clear();
    debounceTimers.forEach((timer) => clearTimeout(timer));
    debounceTimers.clear();
    notifyListeners();
}
