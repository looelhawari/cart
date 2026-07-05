export type CheckoutPhoneUser = {
  phone?: string | null;
};

export const hasRequiredCheckoutPhone = (
  user?: CheckoutPhoneUser | null,
): boolean => {
  return typeof user?.phone === "string" && user.phone.trim().length > 0;
};
