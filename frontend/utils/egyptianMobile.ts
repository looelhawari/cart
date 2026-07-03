export type PhoneValidationResult = {
  normalized: string | null;
  error: string | null;
};

export const normalizeEgyptianMobile = (
  value: string,
  invalidMessage: string,
): PhoneValidationResult => {
  const raw = value.trim();

  if (!raw || /\p{L}/u.test(raw)) {
    return { normalized: null, error: invalidMessage };
  }

  const compact = raw
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .replace(/\[/g, "")
    .replace(/\]/g, "")
    .replace(/\./g, "");

  if (!/^\+?\d+$/.test(compact)) {
    return { normalized: null, error: invalidMessage };
  }

  if (
    (compact.match(/\+/g) || []).length > 1 ||
    (compact.includes("+") && !compact.startsWith("+"))
  ) {
    return { normalized: null, error: invalidMessage };
  }

  const digits = compact.replace(/^\+/, "");
  let local = digits;

  if (digits.startsWith("20")) {
    local = digits.slice(2);
  } else if (digits.startsWith("0")) {
    local = digits.slice(1);
  }

  if (!/^(10|11|12|15)\d{8}$/.test(local)) {
    return { normalized: null, error: invalidMessage };
  }

  const subscriberDigits = local.slice(2).split("");
  if (new Set(subscriberDigits).size === 1) {
    return { normalized: null, error: invalidMessage };
  }

  return { normalized: `+20${local}`, error: null };
};

export const sanitizeEgyptianMobileInput = (value: string, fallback = "") => {
  const digits = value.replace(/\D/g, "");
  let local = digits;

  if (local.startsWith("20")) {
    local = local.slice(2);
  }

  if (local.startsWith("0")) {
    local = local.slice(1);
  }

  if (local.length >= 1 && local[0] !== "1") {
    return fallback;
  }

  if (local.length >= 2 && !["0", "1", "2", "5"].includes(local[1])) {
    return fallback;
  }

  return local.slice(0, 10);
};
