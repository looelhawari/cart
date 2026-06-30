export type ApiFieldErrors = Record<string, string[]>;

export interface SafeApiError {
  success: false;
  message: string;
  status?: number;
  errors?: ApiFieldErrors;
  error_code?: string;
  error_id?: string;
}

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";
const SERVER_FALLBACK_MESSAGE =
  "Something went wrong. Please try again later.";

const TECHNICAL_MESSAGE_PATTERNS = [
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
  /backend/i,
  /env\b/i,
  /configured/i,
  /paymob/i,
  /moto integration/i,
];

export function messageForStatus(status?: number): string {
  if (!status) return FALLBACK_MESSAGE;

  if (status === 0) return "Please check your internet connection and try again.";
  if (status === 400) return "We could not complete your request right now.";
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested item could not be found.";
  if (status === 409) return "This data already exists.";
  if (status === 413) return "The selected file is too large.";
  if (status === 422) return "Please check the entered data.";
  if (status === 429) return "Too many requests. Please wait a moment.";
  if (status >= 500) return SERVER_FALLBACK_MESSAGE;

  return FALLBACK_MESSAGE;
}

export function isTechnicalMessage(message: unknown): boolean {
  if (typeof message !== "string") return true;
  const normalized = message.trim();

  if (!normalized) return true;
  if (normalized.length > 240) return true;

  return TECHNICAL_MESSAGE_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

export function toSafeMessage(
  message: unknown,
  status?: number,
  fallback: string = FALLBACK_MESSAGE,
): string {
  if (typeof message === "string" && !isTechnicalMessage(message)) {
    return message.trim();
  }

  return status ? messageForStatus(status) : fallback;
}

export function normalizeApiErrorPayload(
  payload: unknown,
  status?: number,
  fallback: string = FALLBACK_MESSAGE,
): SafeApiError {
  const body = payload && typeof payload === "object" ? (payload as any) : {};

  return {
    success: false,
    message: toSafeMessage(body.message, status, fallback),
    status,
    errors:
      body.errors && typeof body.errors === "object"
        ? (body.errors as ApiFieldErrors)
        : undefined,
    error_code:
      typeof body.error_code === "string" ? body.error_code : undefined,
    error_id: typeof body.error_id === "string" ? body.error_id : undefined,
  };
}

export function isNetworkError(error: unknown): boolean {
  const candidate = error as any;
  const message = String(candidate?.message || "");

  return (
    candidate?.name === "AbortError" ||
    message === "Network request failed" ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("Network Error")
  );
}

export function createSafeApiError(
  message: string,
  status?: number,
  errorCode?: string,
): SafeApiError {
  return {
    success: false,
    message: toSafeMessage(message, status),
    status,
    error_code: errorCode,
  };
}

export function getSafeErrorMessage(
  error: unknown,
  fallback: string = FALLBACK_MESSAGE,
): string {
  const candidate = error as any;

  if (isNetworkError(error)) {
    return "Please check your internet connection and try again.";
  }

  return toSafeMessage(
    candidate?.response?.data?.message || candidate?.message,
    candidate?.response?.status || candidate?.status,
    fallback,
  );
}
