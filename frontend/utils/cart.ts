/**
 * Shared cart selectors / helpers.
 *
 * The cart is a server-authoritative object stored on the Zustand store as
 * `cart` (see store/index.ts). Item count, total and per-product quantity used
 * to be recomputed inline in many screens with slightly different rules
 * (`items.length` vs summed quantity; `product_id` vs `product.id`). These
 * helpers are the single source of truth so every surface stays consistent.
 */

export interface CartItemLike {
  id: number;
  product_id?: number | string;
  quantity?: number;
  product?: { id?: number | string; barcode?: number | string } | null;
}

export interface CartLike {
  items?: CartItemLike[];
  subtotal?: number | string;
  discount?: number | string;
  total?: number | string;
}

/**
 * Find the cart line for a given product identity. Products are identified by
 * `barcode || id` across the app, and optimistic cart items may carry the id on
 * `product_id`, `product.id` or `product.barcode` — match all of them.
 */
export const findCartItem = (
  cart: CartLike | null | undefined,
  productId: number | string,
): CartItemLike | null => {
  if (!cart?.items?.length || !productId) return null;
  const target = String(productId);
  return (
    cart.items.find(
      (item) =>
        String(item.product_id) === target ||
        String(item.product?.id) === target ||
        String(item.product?.barcode) === target,
    ) || null
  );
};

/** Current quantity of a product in the cart (0 if absent). */
export const getCartItemQuantity = (
  cart: CartLike | null | undefined,
  productId: number | string,
): number => findCartItem(cart, productId)?.quantity || 0;

/** Total number of units in the cart (sum of item quantities). */
export const getCartCount = (cart: CartLike | null | undefined): number =>
  cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

/**
 * Cart value shown before checkout: subtotal minus discount (delivery/tax are
 * added later on the checkout screens). Mirrors app/(tabs)/cart.tsx so the
 * floating bar and the cart screen never disagree.
 */
export const getCartTotal = (cart: CartLike | null | undefined): number => {
  const subtotal = parseFloat(String(cart?.subtotal ?? 0)) || 0;
  const discount = parseFloat(String(cart?.discount ?? 0)) || 0;
  return Math.max(0, subtotal - discount);
};

/** Format a numeric price to a fixed 2-decimal string (currency label added by caller). */
export const formatPrice = (value: number | string | null | undefined): string =>
  (parseFloat(String(value ?? 0)) || 0).toFixed(2);
