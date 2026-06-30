type FieldErrors = Record<string, string[]>;

const DEFAULT_MESSAGE = "Action failed. Please try again.";

const TECHNICAL_PATTERNS = [
    /sqlstate/i,
    /integrity constraint/i,
    /queryexception/i,
    /axioserror/i,
    /network error/i,
    /syntaxerror/i,
    /typeerror/i,
    /referenceerror/i,
    /undefined variable/i,
    /trying to access/i,
    /call to a member function/i,
    /stack trace/i,
    /\btrace\b/i,
    /\bline\s+\d+\b/i,
    /\/app\//i,
    /\\app\\/i,
    /http\s+\d{3}/i,
    /invalid json/i,
    /empty response/i,
    /server returned html/i,
    /received html/i,
    /env\b/i,
    /configured/i,
    /paymob/i,
    /moto integration/i,
]

function statusMessage(status?: number): string {
    if (!status) return DEFAULT_MESSAGE
    if (status === 0) return "Please check your internet connection and try again."
    if (status === 401) return "Your session has expired. Please log in again."
    if (status === 403) return "You do not have permission to perform this action."
    if (status === 404) return "This record could not be found."
    if (status === 409) return "This data already exists."
    if (status === 413) return "The selected file is too large."
    if (status === 422) return "Please check the entered data."
    if (status === 429) return "Too many requests. Please wait a moment."
    if (status >= 500) return "Something went wrong. Please try again later."
    return DEFAULT_MESSAGE
}

function isTechnicalMessage(message: unknown): boolean {
    if (typeof message !== "string") return true
    const normalized = message.trim()
    if (!normalized || normalized.length > 240) return true
    return TECHNICAL_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function getSafeErrorMessage(error: any, fallback = DEFAULT_MESSAGE): string {
    const status = error?.response?.status || error?.status
    const message = error?.response?.data?.message || error?.message

    if (error?.code === "ERR_NETWORK" || /network error|failed to fetch|timeout/i.test(String(message || ""))) {
        return "Please check your internet connection and try again."
    }

    if (typeof message === "string" && !isTechnicalMessage(message)) {
        return message.trim()
    }

    return status ? statusMessage(status) : fallback
}

export function formatFieldErrors(errors?: FieldErrors): string | null {
    if (!errors || typeof errors !== "object") return null

    const lines = Object.entries(errors)
        .flatMap(([field, messages]) =>
            (Array.isArray(messages) ? messages : [String(messages)]).map(
                (message) => `${field.replace(/_/g, " ")}: ${message}`,
            ),
        )
        .filter(Boolean)

    return lines.length > 0 ? lines.join("\n") : null
}

export function normalizeAdminApiError(error: any): Error & {
    status?: number
    errors?: FieldErrors
    response?: any
} {
    const status = error?.response?.status || error?.status
    const originalData = error?.response?.data && typeof error.response.data === "object"
        ? error.response.data
        : {}
    const message = getSafeErrorMessage(error)
    const normalized = new Error(message) as Error & {
        status?: number
        errors?: FieldErrors
        response?: any
    }

    normalized.name = "ApiError"
    normalized.status = status
    normalized.errors = originalData.errors
    normalized.response = error?.response
        ? {
            ...error.response,
            data: {
                ...originalData,
                message,
            },
        }
        : {
            status,
            data: {
                message,
                errors: originalData.errors,
            },
        }

    return normalized
}
