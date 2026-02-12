import * as SecureStore from "expo-secure-store";
import { API_CONFIG, STORAGE_KEYS } from "@/config/app.config";

// ─── Token Management ──────────────────────────────────────────

let _cachedToken: string | null = null;

export const getToken = async (): Promise<string | null> => {
    if (_cachedToken) return _cachedToken;
    _cachedToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    return _cachedToken;
};

export const setToken = async (token: string) => {
    if (!token || typeof token !== "string") {
        throw new Error("Token must be a non-empty string");
    }
    _cachedToken = token;
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
};

export const clearToken = async () => {
    _cachedToken = null;
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
};

// ─── HTTP Helpers ──────────────────────────────────────────────

const headers = async (includeAuth = true): Promise<HeadersInit> => {
    const h: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
    };
    if (includeAuth) {
        const token = await getToken();
        if (token) h.Authorization = `Bearer ${token}`;
    }
    return h;
};

const parseResponse = async (res: Response) => {
    const text = await res.text();
    if (!text || text.trim().length === 0) throw new Error("Empty response");
    if (text.trim().startsWith("<")) throw new Error("Server returned HTML – check backend");
    try {
        return JSON.parse(text);
    } catch {
        throw new Error("Invalid JSON response");
    }
};

export class ApiError extends Error {
    status: number;
    errors?: Record<string, string[]>;
    constructor(message: string, status: number, errors?: Record<string, string[]>) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

async function request<T>(method: string, endpoint: string, body?: any): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const h = await headers();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
        const res = await fetch(url, {
            method,
            headers: h,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        const data = await parseResponse(res);

        if (!res.ok) {
            throw new ApiError(
                data?.message || `HTTP ${res.status}`,
                res.status,
                data?.errors,
            );
        }

        return data as T;
    } catch (err: any) {
        if (err.name === "AbortError") throw new Error("Request timed out");
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

export const api = {
    get: <T>(endpoint: string, params?: Record<string, string | number | undefined>) => {
        let url = endpoint;
        if (params) {
            const filtered = Object.entries(params).filter(([, v]) => v !== undefined);
            if (filtered.length) url += "?" + new URLSearchParams(filtered.map(([k, v]) => [k, String(v)])).toString();
        }
        return request<T>("GET", url);
    },
    post: <T>(endpoint: string, body?: any) => request<T>("POST", endpoint, body),
    put: <T>(endpoint: string, body?: any) => request<T>("PUT", endpoint, body),
    delete: <T>(endpoint: string) => request<T>("DELETE", endpoint),
};
