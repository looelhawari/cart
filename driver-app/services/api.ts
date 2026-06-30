import * as SecureStore from "expo-secure-store";
import { API_CONFIG, STORAGE_KEYS } from "@/config/app.config";

const TECHNICAL_MESSAGE_PATTERNS = [
    /sqlstate/i,
    /queryexception/i,
    /axioserror/i,
    /network error/i,
    /syntaxerror/i,
    /typeerror/i,
    /stack trace/i,
    /\bline\s+\d+\b/i,
    /\/app\//i,
    /\\app\\/i,
    /http\s+\d{3}/i,
    /invalid json/i,
    /empty response/i,
    /server returned html/i,
    /backend/i,
    /env\b/i,
    /paymob/i,
];

const messageForStatus = (status?: number) => {
    if (!status || status === 0) return "Please check your internet connection and try again.";
    if (status === 401) return "Your session has expired. Please log in again.";
    if (status === 403) return "You do not have permission to perform this action.";
    if (status === 404) return "The requested item could not be found.";
    if (status === 422) return "Please check the entered data.";
    if (status === 429) return "Too many requests. Please wait a moment.";
    if (status >= 500) return "Something went wrong. Please try again later.";
    return "Action failed. Please try again.";
};

const safeMessage = (message: unknown, status?: number) => {
    if (typeof message === "string") {
        const normalized = message.trim();
        const isTechnical =
            !normalized ||
            normalized.length > 240 ||
            TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(normalized));

        if (!isTechnical) return normalized;
    }

    return messageForStatus(status);
};

// ─── Token Management ──────────────────────────────────────────

let _cachedToken: string | null = null;

export const getToken = async (): Promise<string | null> => {
    if (_cachedToken) return _cachedToken;
    _cachedToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    return _cachedToken;
};

export const setToken = async (token: string) => {
    if (!token || typeof token !== "string") {
        throw new ApiError("We could not complete your request right now.", 0);
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
    if (!text || text.trim().length === 0) {
        throw new ApiError(messageForStatus(res.status), res.status);
    }
    if (text.trim().startsWith("<")) {
        throw new ApiError(messageForStatus(res.status), res.status);
    }
    try {
        return JSON.parse(text);
    } catch {
        throw new ApiError(messageForStatus(res.status), res.status);
    }
};

export class ApiError extends Error {
    status: number;
    errors?: Record<string, string[]>;
    constructor(message: string, status: number, errors?: Record<string, string[]>) {
        super(safeMessage(message, status));
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
                data?.message || messageForStatus(res.status),
                res.status,
                data?.errors,
            );
        }

        return data as T;
    } catch (err: any) {
        if (err instanceof ApiError) throw err;
        if (err.name === "AbortError") {
            throw new ApiError("Connection lost. Please try again.", 0);
        }
        throw new ApiError("Please check your internet connection and try again.", 0);
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
