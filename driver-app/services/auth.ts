import { api, setToken, clearToken } from "./api";
import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "@/config/app.config";

// ─── Types ─────────────────────────────────────────

export interface Driver {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role: string;
    avatar: string | null;
    is_available: boolean;
    current_lat: number | null;
    current_lng: number | null;
    assigned_zone_id: number | null;
    vehicle_type: string | null;
    vehicle_plate: string | null;
    total_deliveries: number;
    average_rating: string | null;
    assigned_zone?: {
        id: number;
        name: string;
        name_ar: string;
    } | null;
}

export interface LoginResponse {
    success: boolean;
    data: {
        user: Driver;
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
    };
    message: string;
}

// ─── Auth Service ──────────────────────────────────

export const authService = {
    login: async (email: string, password: string): Promise<Driver> => {
        const res = await api.post<LoginResponse>("/auth/login", {
            email,
            password,
            device_name: "driver-app",
        });

        if (!res || typeof res !== "object") {
            throw new Error("We could not complete your request right now.");
        }

        if (!res.success) {
            throw new Error(res.message || "Login failed");
        }

        // Validate response structure
        if (!res.data || typeof res.data !== "object") {
            throw new Error("We could not complete your request right now.");
        }

        const { user, access_token } = res.data;

        // Validate required fields
        if (!access_token || typeof access_token !== "string") {
            throw new Error("We could not complete your request right now.");
        }
        if (!user || typeof user !== "object") {
            throw new Error("We could not complete your request right now.");
        }

        // Only allow driver role
        if (user.role !== "driver") {
            throw new Error("This app is for drivers only. Please use the customer app.");
        }

        // Store token and user data
        await setToken(access_token);
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

        return user;
    },

    logout: async (): Promise<void> => {
        try {
            await api.post("/auth/logout");
        } catch {
            // Ignore logout API errors
        }
        await clearToken();
    },

    getStoredUser: async (): Promise<Driver | null> => {
        const data = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    },

    getProfile: async (): Promise<Driver> => {
        const res = await api.get<{ success: boolean; data: Driver }>("/auth/profile");
        return res.data;
    },

    updateProfile: async (data: { first_name?: string; last_name?: string; phone?: string }): Promise<Driver> => {
        const res = await api.put<{ success: boolean; data: Driver }>("/auth/profile", data);
        return res.data;
    },

    changePassword: async (current: string, newPw: string, confirm: string): Promise<void> => {
        await api.post("/auth/change-password", {
            current_password: current,
            new_password: newPw,
            new_password_confirmation: confirm,
        });
    },
};
