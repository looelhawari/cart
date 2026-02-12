import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService, Driver } from "@/services/auth";
import { getToken } from "@/services/api";
import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "@/config/app.config";

interface AuthContextType {
    driver: Driver | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [driver, setDriver] = useState<Driver | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check stored session on mount
    useEffect(() => {
        (async () => {
            try {
                const token = await getToken();
                if (token) {
                    const stored = await authService.getStoredUser();
                    if (stored) {
                        setDriver(stored);
                        // Refresh profile in background
                        try {
                            const fresh = await authService.getProfile();
                            if (fresh.role === "driver") {
                                setDriver(fresh);
                                // Persist refreshed data
                                await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(fresh));
                            } else {
                                await authService.logout();
                            }
                        } catch {
                            // Token expired
                            await authService.logout();
                            setDriver(null);
                        }
                    }
                }
            } catch {
                // No stored session
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const user = await authService.login(email, password);
        setDriver(user);
    }, []);

    const logout = useCallback(async () => {
        await authService.logout();
        setDriver(null);
    }, []);

    const refreshProfile = useCallback(async () => {
        try {
            const fresh = await authService.getProfile();
            setDriver(fresh);
            // Persist updated profile data
            await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(fresh));
        } catch { }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                driver,
                isLoading,
                isAuthenticated: !!driver,
                login,
                logout,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
