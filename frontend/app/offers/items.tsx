import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { getOffers } from "@/services/api/offersApi";
import { getProduct, getProducts } from "@/services/api/productsApi";
import type { Offer } from "@/services/api/types";
import type { Product } from "@/types";

type DisplayProduct = {
  id: number;
  name_en: string;
  image: string | null;
  price: number;
  discounted_price: number | null;
};

type Section = {
  title: string;
  subtitle?: string;
  items: DisplayProduct[];
};

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

const formatPrice = (value?: number | null) => {
  const safe = toNumber(value ?? 0);
  return safe.toFixed(2);
};

const toDisplayProduct = (
  product: {
    id: number;
    name_en: string;
    image?: string | null;
    price?: number | string | null;
    sale_price?: number | string | null;
  },
  offer: Offer,
  overrideDiscount?: { type: "free" | "percentage" | "fixed_amount"; value: number },
): DisplayProduct => {
  const basePrice = toNumber(product.sale_price ?? product.price);

  const discountType = overrideDiscount?.type ?? offer.type;
  const discountValue = toNumber(overrideDiscount?.value ?? offer.value);

  let discounted = null;
  if (discountType === "percentage") {
    discounted = Math.max(basePrice * (1 - discountValue / 100), 0);
  } else if (discountType === "fixed_amount") {
    discounted = Math.max(basePrice - discountValue, 0);
  } else if (discountType === "free") {
    discounted = 0;
  }

  return {
    id: product.id,
    name_en: product.name_en,
    image: product.image ?? null,
    price: basePrice,
    discounted_price: discounted,
  };
};

const mergeUnique = (items: DisplayProduct[]): DisplayProduct[] => {
  const map = new Map<number, DisplayProduct>();
  items.forEach((item) => {
    map.set(item.id, item);
  });
  return Array.from(map.values());
};

const fetchAllProductsByCategory = async (categoryId: number): Promise<Product[]> => {
  let page = 1;
  let lastPage = 1;
  const allProducts: Product[] = [];

  while (page <= lastPage) {
    const response = await getProducts({ category_id: categoryId, per_page: 100, page }, false);
    if (!response.success) {
      break;
    }
    allProducts.push(...(response.data.products || []));
    lastPage = response.data.pagination?.last_page ?? 1;
    page += 1;
  }

  return allProducts;
};

export default function OfferItemsScreen() {
  const params = useLocalSearchParams();
  const offerId = Number(params.offerId);

  const [offer, setOffer] = useState<Offer | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await getOffers({ status: "all" });
        const found = response.data.offers.find((item) => item.id === offerId) || null;
        setOffer(found);

        if (!found) {
          setSections([]);
          return;
        }

        if (found.type === "free_delivery") {
          setSections([]);
          return;
        }

        if (found.type === "bogo" && found.targets.bogo_rules.length > 0) {
          const rule = found.targets.bogo_rules[0];
          const buyItems: DisplayProduct[] = [];
          const getItems: DisplayProduct[] = [];

          if (rule.buy_scope === "product" && rule.buy_product_id) {
            const productResponse = await getProduct(rule.buy_product_id, false);
            buyItems.push(
              toDisplayProduct(
                {
                  id: productResponse.data.product.barcode,
                  name_en: productResponse.data.product.name_en,
                  image: productResponse.data.product.image,
                  price: productResponse.data.product.price,
                  sale_price: productResponse.data.product.sale_price,
                },
                found,
              ),
            );
          }

          if (rule.buy_scope === "category" && rule.buy_category_id) {
            const products = await fetchAllProductsByCategory(rule.buy_category_id);
            products.forEach((product) => {
              buyItems.push(
                toDisplayProduct(
                  {
                    id: product.barcode,
                    name_en: product.name_en,
                    image: product.image,
                    price: product.price,
                    sale_price: product.sale_price,
                  },
                  found,
                ),
              );
            });
          }

          if (rule.get_scope === "product" && rule.get_product_id) {
            const productResponse = await getProduct(rule.get_product_id, false);
            getItems.push(
              toDisplayProduct(
                {
                  id: productResponse.data.product.barcode,
                  name_en: productResponse.data.product.name_en,
                  image: productResponse.data.product.image,
                  price: productResponse.data.product.price,
                  sale_price: productResponse.data.product.sale_price,
                },
                found,
                { type: rule.get_discount_type, value: rule.get_discount_value },
              ),
            );
          }

          if (rule.get_scope === "category" && rule.get_category_id) {
            const products = await fetchAllProductsByCategory(rule.get_category_id);
            products.forEach((product) => {
              getItems.push(
                toDisplayProduct(
                  {
                    id: product.barcode,
                    name_en: product.name_en,
                    image: product.image,
                    price: product.price,
                    sale_price: product.sale_price,
                  },
                  found,
                  { type: rule.get_discount_type, value: rule.get_discount_value },
                ),
              );
            });
          }

          setSections([
            {
              title: "Buy items",
              subtitle: "These items unlock the deal",
              items: mergeUnique(buyItems),
            },
            {
              title: "Get items",
              subtitle: "These items receive the offer",
              items: mergeUnique(getItems),
            },
          ]);
          return;
        }

        if (found.applies_to === "product") {
          const items = found.targets.products.map((product) =>
            toDisplayProduct(
              {
                id: product.id,
                name_en: product.name_en,
                image: product.image,
                price: product.price,
                sale_price: product.sale_price ?? null,
              },
              found,
            ),
          );
          setSections([
            {
              title: "Offer products",
              subtitle: "All items included in this offer",
              items,
            },
          ]);
          return;
        }

        if (found.applies_to === "category") {
          const products: DisplayProduct[] = [];
          for (const category of found.targets.categories) {
            const categoryProducts = await fetchAllProductsByCategory(category.id);
            categoryProducts.forEach((product) => {
              products.push(
                toDisplayProduct(
                  {
                    id: product.barcode,
                    name_en: product.name_en,
                    image: product.image,
                    price: product.price,
                    sale_price: product.sale_price,
                  },
                  found,
                ),
              );
            });
          }

          setSections([
            {
              title: "Category items",
              subtitle: "All items included in this offer",
              items: mergeUnique(products),
            },
          ]);
          return;
        }

        if (found.applies_to === "order") {
          setSections([]);
          return;
        }

        setSections([]);
      } finally {
        setLoading(false);
      }
    };

    if (Number.isFinite(offerId)) {
      load();
    } else {
      setLoading(false);
    }
  }, [offerId]);

  const hasItems = useMemo(
    () => sections.some((section) => section.items.length > 0),
    [sections],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Offer items",
          headerStyle: { backgroundColor: Colors.neutralWhite },
          headerTitleStyle: {
            fontSize: Typography.h3,
            fontWeight: Typography.bold as "700",
            color: Colors.neutralCharcoal,
          },
        }}
      />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary900} />
          </View>
        ) : !offer ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Offer not found</Text>
            <Text style={styles.emptyText}>Please return to offers and try again.</Text>
          </View>
        ) : offer.type === "free_delivery" ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Free delivery offer</Text>
            <Text style={styles.emptyText}>
              This offer applies to delivery fees only.
            </Text>
          </View>
        ) : offer.type === "bogo" && !hasItems ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>BOGO offer</Text>
            <Text style={styles.emptyText}>
              Add the eligible buy and get items to see this offer.
            </Text>
          </View>
        ) : offer.applies_to === "order" && offer.type !== "bogo" ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Whole cart offer</Text>
            <Text style={styles.emptyText}>
              This offer applies to your entire cart at checkout.
            </Text>
          </View>
        ) : !hasItems ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No items available</Text>
            <Text style={styles.emptyText}>
              The offer items are not available right now.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.subtitle && (
                  <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                )}
                {section.items.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.productCard,
                      pressed && styles.productCardPressed,
                    ]}
                    onPress={() => router.push(`/product/${item.id}`)}
                  >
                    {item.image && (
                      <Image source={{ uri: item.image }} style={styles.productImage} />
                    )}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {item.name_en}
                      </Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceText}>
                          {item.discounted_price !== null
                            ? formatPrice(item.discounted_price)
                            : formatPrice(item.price)}{" "}
                          EGP
                        </Text>
                        {item.discounted_price !== null && (
                          <Text style={styles.originalPrice}>
                            {formatPrice(item.price)} EGP
                          </Text>
                        )}
                      </View>
                      {item.discounted_price !== null && (
                        <Text style={styles.offerHint}>Offer price applied</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold as "700",
    color: Colors.neutralCharcoal,
  },
  sectionSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
    gap: Spacing.md,
  },
  productCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: Colors.neutralLight,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  priceText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  originalPrice: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    textDecorationLine: "line-through",
  },
  offerHint: {
    fontSize: Typography.bodySmall,
    color: Colors.accentOrange,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold as "700",
    color: Colors.neutralCharcoal,
  },
  emptyText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    textAlign: "center",
  },
});
