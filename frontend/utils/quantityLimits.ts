/**
 * Product quantity limits — per-order restrictions for specific barcodes.
 * Must stay in sync with backend: CartService::QUANTITY_LIMITED_PRODUCTS
 */

const QUANTITY_LIMITED_PRODUCTS: Record<string, number> = {
  "6224010081116": 2,
  "6224008513025": 2,
  "6223001930600": 2,
  "6223001930594": 2,
  "6223001930556": 2,
  "6223001930518": 2,
  "5449000232045": 2,
  "5449000200976": 2,
};

/**
 * Get the maximum quantity per order for a product barcode.
 * Returns `null` if the product has no special limit.
 */
export function getMaxPerOrder(barcode: string | number): number | null {
  return QUANTITY_LIMITED_PRODUCTS[String(barcode)] ?? null;
}

/**
 * Check if a product barcode has a per-order quantity limit.
 */
export function isQuantityLimited(barcode: string | number): boolean {
  return String(barcode) in QUANTITY_LIMITED_PRODUCTS;
}
