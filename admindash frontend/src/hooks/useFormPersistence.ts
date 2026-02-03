import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook to persist form state in localStorage with auto-save
 * Helps prevent data loss when navigating or refreshing
 */
export function useFormPersistence<T>(
    key: string,
    initialValue: T,
    options: {
        debounceMs?: number;
        clearOnSuccess?: boolean;
    } = {}
) {
    const { debounceMs = 1000 } = options

    const [value, setValue] = useState<T>(() => {
        try {
            const stored = localStorage.getItem(`form_draft_${key}`)
            if (stored) {
                const parsed = JSON.parse(stored)
                return { ...initialValue, ...parsed }
            }
        } catch (e) {
            console.error('Error loading form draft:', e)
        }
        return initialValue
    })

    const [isDirty, setIsDirty] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)

    // Debounced save to localStorage
    useEffect(() => {
        if (!isDirty) return

        const timeoutId = setTimeout(() => {
            try {
                localStorage.setItem(`form_draft_${key}`, JSON.stringify(value))
                setLastSaved(new Date())
            } catch (e) {
                console.error('Error saving form draft:', e)
            }
        }, debounceMs)

        return () => clearTimeout(timeoutId)
    }, [value, key, debounceMs, isDirty])

    const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
        setValue((prev) => {
            const resolved = typeof newValue === 'function'
                ? (newValue as (prev: T) => T)(prev)
                : newValue
            return resolved
        })
        setIsDirty(true)
    }, [])

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(`form_draft_${key}`)
            setIsDirty(false)
            setLastSaved(null)
        } catch (e) {
            console.error('Error clearing form draft:', e)
        }
    }, [key])

    const hasDraft = useCallback(() => {
        try {
            return localStorage.getItem(`form_draft_${key}`) !== null
        } catch {
            return false
        }
    }, [key])

    const resetToInitial = useCallback(() => {
        setValue(initialValue)
        clearDraft()
    }, [initialValue, clearDraft])

    return {
        value,
        setValue: updateValue,
        isDirty,
        lastSaved,
        clearDraft,
        hasDraft,
        resetToInitial,
    }
}

/**
 * Custom hook to warn users before navigating away with unsaved changes
 */
export function useUnsavedChangesWarning(isDirty: boolean, message?: string) {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault()
                e.returnValue = message || 'You have unsaved changes. Are you sure you want to leave?'
                return e.returnValue
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isDirty, message])
}

/**
 * Custom hook to manage admin session state (filters, pagination, etc.)
 */
export function useSessionState<T>(key: string, initialValue: T) {
    const [value, setValue] = useState<T>(() => {
        try {
            const stored = sessionStorage.getItem(`admin_session_${key}`)
            if (stored) {
                return JSON.parse(stored)
            }
        } catch (e) {
            console.error('Error loading session state:', e)
        }
        return initialValue
    })

    useEffect(() => {
        try {
            sessionStorage.setItem(`admin_session_${key}`, JSON.stringify(value))
        } catch (e) {
            console.error('Error saving session state:', e)
        }
    }, [key, value])

    const clearSession = useCallback(() => {
        try {
            sessionStorage.removeItem(`admin_session_${key}`)
            setValue(initialValue)
        } catch (e) {
            console.error('Error clearing session state:', e)
        }
    }, [key, initialValue])

    return [value, setValue, clearSession] as const
}

/**
 * Utility to clear all form drafts (for logout or settings reset)
 */
export function clearAllFormDrafts() {
    try {
        const keys = Object.keys(localStorage)
        keys.forEach((key) => {
            if (key.startsWith('form_draft_')) {
                localStorage.removeItem(key)
            }
        })
    } catch (e) {
        console.error('Error clearing all form drafts:', e)
    }
}

/**
 * Utility to clear all session states
 */
export function clearAllSessionStates() {
    try {
        const keys = Object.keys(sessionStorage)
        keys.forEach((key) => {
            if (key.startsWith('admin_session_')) {
                sessionStorage.removeItem(key)
            }
        })
    } catch (e) {
        console.error('Error clearing all session states:', e)
    }
}
