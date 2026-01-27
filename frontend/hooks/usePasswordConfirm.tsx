import { useState, useCallback } from "react";
import React from "react";
import PasswordConfirmModal from "@/components/PasswordConfirmModal";

interface UsePasswordConfirmOptions {
    title?: string;
    message?: string;
}

export function usePasswordConfirm(options?: UsePasswordConfirmOptions) {
    const [visible, setVisible] = useState(false);
    const [resolveCallback, setResolveCallback] = useState<
        ((confirmed: boolean) => void) | null
    >(null);

    const requestConfirmation = useCallback((): Promise<boolean> => {
        return new Promise((resolve) => {
            setVisible(true);
            setResolveCallback(() => resolve);
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setVisible(false);
        if (resolveCallback) {
            resolveCallback(true);
            setResolveCallback(null);
        }
    }, [resolveCallback]);

    const handleCancel = useCallback(() => {
        setVisible(false);
        if (resolveCallback) {
            resolveCallback(false);
            setResolveCallback(null);
        }
    }, [resolveCallback]);

    const PasswordModal = () => (
        <PasswordConfirmModal
            visible={visible}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            title={options?.title}
            message={options?.message}
        />
    );

    return {
        requestConfirmation,
        PasswordModal,
    };
}
