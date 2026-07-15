import type { Product } from "@/types";

/**
 * Home-page product collections.
 *
 * The backend exposes no personalization or velocity metrics, so "Recommended"
 * and "Trending" are synthesized on the client from the sorted product pools we
 * already fetch (featured / popular / newest / top-rated / on-sale). A rolling
 * de-duplication set guarantees the same product does not reappear across
 * consecutive sections within a short scroll — every lane keeps surfacing
 * fresh items, which is the whole point of a discovery feed.
 */

export type CollectionId =
  | "recommended"
  | "trending"
  | "new_arrivals"
  | "popular"
  | "top_rated"
  | "fresh";

export interface CollectionPools {
  /** GET /products/featured */
  featured: Product[];
  /** GET /products?sort_by=sales_count&sort_order=desc */
  popular: Product[];
  /** GET /products?sort_by=created_at&sort_order=desc */
  newArrivals: Product[];
  /** GET /products?sort_by=rating&sort_order=desc */
  topRated: Product[];
  /** GET /products/flash-deals (on-sale) */
  flashDeals: Product[];
}

export interface ProductCollection {
  id: CollectionId;
  products: Product[];
}

export interface BuildOptions {
  /** Max products a single collection may show. */
  maxPerCollection?: number;
  /** A collection with fewer than this (after de-dup) is dropped, avoiding sparse lanes. */
  minPerCollection?: number;
}

const codeOf = (p: Product): number | string | null =>
  (p?.barcode ?? (p as any)?.id) ?? null;

const isInStock = (p: Product): boolean =>
  p?.is_in_stock !== false && (p?.stock_quantity ?? 1) > 0;

/**
 * Round-robin merge of several ordered lists into one, dropping duplicates so
 * the highest-ranked item from each source appears first. Used to synthesize
 * blended collections (e.g. Recommended = featured ⋈ top-rated ⋈ popular).
 */
export const blendLists = (...lists: Product[][]): Product[] => {
  const seen = new Set<number | string>();
  const out: Product[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l?.length || 0));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      const p = list?.[i];
      if (!p) continue;
      const code = codeOf(p);
      if (code == null || seen.has(code)) continue;
      seen.add(code);
      out.push(p);
    }
  }
  return out;
};

/**
 * Build the ordered list of product collections shown on the home page,
 * de-duplicating across sections so users continuously discover new items.
 * Collections that cannot reach `minPerCollection` fresh items are omitted.
 */
export const buildProductCollections = (
  pools: CollectionPools,
  { maxPerCollection = 10, minPerCollection = 4 }: BuildOptions = {},
): ProductCollection[] => {
  const used = new Set<number | string>();

  const take = (
    candidates: Product[],
    id: CollectionId,
  ): ProductCollection | null => {
    const picked: Product[] = [];
    for (const p of candidates || []) {
      const code = codeOf(p);
      if (code == null || used.has(code) || !isInStock(p)) continue;
      picked.push(p);
      if (picked.length >= maxPerCollection) break;
    }
    if (picked.length < minPerCollection) return null;
    picked.forEach((p) => used.add(codeOf(p) as number | string));
    return { id, products: picked };
  };

  // Order matters: earlier collections get first pick of the shared pools.
  const ordered = [
    take(blendLists(pools.featured, pools.topRated, pools.popular), "recommended"),
    take(blendLists(pools.popular, pools.topRated), "trending"),
    take(pools.newArrivals, "new_arrivals"),
    take(pools.popular, "popular"),
    take(pools.topRated, "top_rated"),
    take(pools.flashDeals, "fresh"),
  ];

  return ordered.filter((c): c is ProductCollection => c !== null);
};
