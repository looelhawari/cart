export type CheckoutPhoneUser = {
  phone?: string | null;
};

export type SignupInfoUser = CheckoutPhoneUser & {
  first_name?: string | null;
  date_of_birth?: string | null;
  gender?: "male" | "female" | "other" | string | null;
};

export const hasRequiredCheckoutPhone = (
  user?: CheckoutPhoneUser | null,
): boolean => {
  return typeof user?.phone === "string" && user.phone.trim().length > 0;
};

const hasText = (value?: string | null): boolean => {
  return typeof value === "string" && value.trim().length > 0;
};

export const hasRequiredSignupInfo = (
  user?: SignupInfoUser | null,
): boolean => {
  return Boolean(
    user &&
      hasText(user.first_name) &&
      hasRequiredCheckoutPhone(user) &&
      hasText(user.date_of_birth) &&
      hasText(user.gender),
  );
};

export const needsSignupInfoCompletion = (
  user?: SignupInfoUser | null,
): boolean => {
  return !hasRequiredSignupInfo(user);
};
