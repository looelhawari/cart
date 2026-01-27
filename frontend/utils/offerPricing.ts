import type { Offer } from "@/services/api/types";
import type { Category, Product } from "@/types";
import { getOffers } from "@/services/api/offersApi";

export type ProductOfferPricing = {
  offerId: number;
  code: string;
  type: "percentage" | "fixed_amount";
  discountedPrice: number;
  originalPrice: number;
  discountAmount: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedActiveOffers: Offer[] | null = null;
let cachedAt = 0;

const toNumber = (value?: number | string | null) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getBasePrice = (product: Product) => {
  const price = toNumber(product.price);
  const sale = toNumber(product.sale_price ?? product.salePrice);
  if (sale > 0 && sale < price) {
    return sale;
  }
  return price;
};

const getProductCategories = (product: Product): Category[] => {
  if (Array.isArray(product.categories)) {
    return product.categories as Category[];
  }
  return [];
};

export const fetchActiveOffersCached = async (): Promise<Offer[]> => {
  if (cachedActiveOffers && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedActiveOffers;
  }

  const response = await getOffers({ status: "active" });
  const offers = response.data.offers || [];
  cachedActiveOffers = offers;
  cachedAt = Date.now();
  return offers;
};

const matchesCategoryOffer = (
  product: Product,
  offer: Offer,
  context?: { categoryId?: number },
) => {
  const productCategories = getProductCategories(product);
  const targetCategories = offer.targets.categories;
  if (context?.categoryId) {
    return targetCategories.some((target) => target.id === context.categoryId);
  }

  return targetCategories.some((target) =>
    productCategories.some((category) => {
      if (category.id === target.id) return true;
      if (target.include_subcategories && category.parent_id === target.id) {
        return true;
      }
      return false;
    }),
  );
};

export const getProductOfferPricing = (
  product: Product,
  offers: Offer[],
  context?: { categoryId?: number },
): ProductOfferPricing | null => {
  if (!product || offers.length === 0) return null;

  const productId = Number(product.barcode || product.id || 0);
  const basePrice = getBasePrice(product);
  if (basePrice <= 0) return null;

  let best: ProductOfferPricing | null = null;

  for (const offer of offers) {
    if (offer.status !== "active") continue;
    if (offer.type !== "percentage" && offer.type !== "fixed_amount") continue;

    let isMatch = false;

    if (offer.applies_to === "product") {
      isMatch = offer.targets.products.some((target) => target.id === productId);
    } else if (offer.applies_to === "category") {
      isMatch = matchesCategoryOffer(product, offer, context);
    }

    if (!isMatch) continue;

    const rawDiscount =
      offer.type === "percentage"
        ? basePrice * (offer.value / 100)
        : offer.value;
    const cappedDiscount = offer.maximum_discount
      ? Math.min(rawDiscount, offer.maximum_discount)
      : rawDiscount;
    const discountAmount = Math.min(Math.max(cappedDiscount, 0), basePrice);
    if (discountAmount <= 0) continue;

    const discountedPrice = Math.max(basePrice - discountAmount, 0);

    if (!best || discountAmount > best.discountAmount) {
      best = {
        offerId: offer.id,
        code: offer.code,
        type: offer.type,
        discountedPrice,
        originalPrice: basePrice,
        discountAmount,
      };
    }
  }

  return best;
};
