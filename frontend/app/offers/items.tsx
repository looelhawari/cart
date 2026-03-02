import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Pressable,
  FlatList,
  ImageBackground,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useLocalizedValue, useTranslation } from "@/i18n";
import { getOffers } from "@/services/api/offersApi";
import { getProduct, getProducts } from "@/services/api/productsApi";
import { getCategories } from "@/services/api/categoryApi";
import type { Offer } from "@/services/api/types";
import type { Category, Product } from "@/types";
import { getCachedImage } from "@/services/cache/imageCache";

const { width } = Dimensions.get("window");
const CATEGORY_CARD_WIDTH = (width - Spacing.lg * 3) / 2;

type DisplayProduct = {
  id: number;
  name_en: string;
  name_ar?: string;
  image: string | null;
  price: number;
  discounted_price: number | null;
};

type Section = {
  title: string;
  subtitle?: string;
  items: DisplayProduct[];
};

type DisplayCategory = {
  id: number;
  name_en: string;
  name_ar?: string;
  image?: string | null;
  products_count?: number | null;
  include_subcategories: boolean;
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
    name_ar?: string;
    image?: string | null;
    price?: number | string | null;
    sale_price?: number | string | null;
  },
  offer: Offer,
  overrideDiscount?: {
    type: "free" | "percentage" | "fixed_amount";
    value: number;
  },
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
    name_ar: product.name_ar,
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

const fetchAllProductsByCategory = async (
  categoryId: number,
): Promise<Product[]> => {
  let page = 1;
  let lastPage = 1;
  const allProducts: Product[] = [];

  while (page <= lastPage) {
    const response = await getProducts(
      { category_id: categoryId, per_page: 100, page },
      false,
    );
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
  const { t } = useTranslation();
  const { getName } = useLocalizedValue();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [categoryTargets, setCategoryTargets] = useState<DisplayCategory[]>([]);
  const [categoryImages, setCategoryImages] = useState<Map<number, string>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await getOffers({ status: "all" });
        const found =
          response.data.offers.find((item) => item.id === offerId) || null;
        setOffer(found);
        setCategoryTargets([]);
        setCategoryImages(new Map());

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
            const productResponse = await getProduct(
              rule.buy_product_id,
              false,
            );
            buyItems.push(
              toDisplayProduct(
                {
                  id: productResponse.data.product.barcode,
                  name_en: productResponse.data.product.name_en,
                  name_ar: productResponse.data.product.name_ar,
                  image: productResponse.data.product.image,
                  price: productResponse.data.product.price,
                  sale_price: productResponse.data.product.sale_price,
                },
                found,
              ),
            );
          }

          if (rule.buy_scope === "category" && rule.buy_category_id) {
            const products = await fetchAllProductsByCategory(
              rule.buy_category_id,
            );
            products.forEach((product) => {
              buyItems.push(
                toDisplayProduct(
                  {
                    id: product.barcode,
                    name_en: product.name_en,
                    name_ar: product.name_ar,
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
            const productResponse = await getProduct(
              rule.get_product_id,
              false,
            );
            getItems.push(
              toDisplayProduct(
                {
                  id: productResponse.data.product.barcode,
                  name_en: productResponse.data.product.name_en,
                  name_ar: productResponse.data.product.name_ar,
                  image: productResponse.data.product.image,
                  price: productResponse.data.product.price,
                  sale_price: productResponse.data.product.sale_price,
                },
                found,
                {
                  type: rule.get_discount_type,
                  value: rule.get_discount_value,
                },
              ),
            );
          }

          if (rule.get_scope === "category" && rule.get_category_id) {
            const products = await fetchAllProductsByCategory(
              rule.get_category_id,
            );
            products.forEach((product) => {
              getItems.push(
                toDisplayProduct(
                  {
                    id: product.barcode,
                    name_en: product.name_en,
                    name_ar: product.name_ar,
                    image: product.image,
                    price: product.price,
                    sale_price: product.sale_price,
                  },
                  found,
                  {
                    type: rule.get_discount_type,
                    value: rule.get_discount_value,
                  },
                ),
              );
            });
          }

          setSections([
            {
              title: t.ui.buyItems,
              subtitle: t.ui.buyItemsDesc,
              items: mergeUnique(buyItems),
            },
            {
              title: t.ui.getItems,
              subtitle: t.ui.getItemsDesc,
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
                name_ar: product.name_ar,
                image: product.image,
                price: product.price,
                sale_price: product.sale_price ?? null,
              },
              found,
            ),
          );
          setSections([
            {
              title: t.ui.offerProducts,
              subtitle: t.ui.offerProductsDesc,
              items,
            },
          ]);
          return;
        }

        if (found.applies_to === "category") {
          const categoriesResponse = await getCategories();
          const allCategories = categoriesResponse.success
            ? categoriesResponse.data.categories
            : [];
          const categoryMap = new Map<number, Category>();
          allCategories.forEach((category) => {
            categoryMap.set(category.id, category);
          });

          const displayCategories: DisplayCategory[] =
            found.targets.categories.map((target) => {
              const full = categoryMap.get(target.id);
              return {
                id: target.id,
                name_en: target.name_en,
                name_ar: target.name_ar,
                image: full?.image || null,
                products_count: full?.products_count ?? null,
                include_subcategories: target.include_subcategories,
              };
            });

          setCategoryTargets(displayCategories);

          const imageCache = new Map<number, string>();
          await Promise.all(
            displayCategories.map(async (category) => {
              if (category.image) {
                const cachedUri = await getCachedImage(category.image);
                if (cachedUri) {
                  imageCache.set(category.id, cachedUri);
                }
              }
            }),
          );
          setCategoryImages(imageCache);
          setSections([]);
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
  }, [offerId, t]);

  const hasItems = useMemo(
    () => sections.some((section) => section.items.length > 0),
    [sections],
  );
  const hasCategoryItems = categoryTargets.length > 0;

  const offerValueLabel = useMemo(() => {
    if (!offer) return "Offer";
    if (offer.type === "percentage") {
      return `${Math.round(offer.value)}% ${t.ui.off}`;
    }
    if (offer.type === "fixed_amount") {
      return `${t.common.currency} ${Math.round(offer.value)} ${t.ui.off}`;
    }
    return "Offer";
  }, [offer]);

  const renderCategoryCard = ({ item }: { item: DisplayCategory }) => {
    const defaultImage =
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800";
    const imageUri = categoryImages.get(item.id) || item.image || defaultImage;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.categoryCard,
          pressed && styles.categoryCardPressed,
        ]}
        onPress={() => router.push(`/categories/${item.id}` as any)}
      >
        <ImageBackground
          source={{ uri: imageUri }}
          style={styles.cardBackground}
          imageStyle={styles.cardImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)"]}
            style={styles.gradient}
          >
            <Text style={styles.categoryName} numberOfLines={2}>
              {getName(item)}
            </Text>
            {item.products_count !== null &&
              item.products_count !== undefined && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {item.products_count}
                  </Text>
                </View>
              )}
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>{offerValueLabel}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t.ui.offerItems,
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
            <Text style={styles.emptyTitle}>{t.ui.offerNotFound}</Text>
            <Text style={styles.emptyText}>{t.ui.pleaseReturnToOffers}</Text>
          </View>
        ) : offer.type === "free_delivery" ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t.ui.freeDeliveryOffer}</Text>
            <Text style={styles.emptyText}>{t.ui.freeDeliveryOfferDesc}</Text>
          </View>
        ) : offer.type === "bogo" && !hasItems ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t.ui.bogoOffer}</Text>
            <Text style={styles.emptyText}>{t.ui.bogoOfferDesc}</Text>
          </View>
        ) : offer.applies_to === "category" ? (
          hasCategoryItems ? (
            <FlatList
              data={categoryTargets}
              renderItem={renderCategoryCard}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.categoryRow}
              contentContainerStyle={styles.categoryList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {t.ui.noCategoriesAvailable}
              </Text>
              <Text style={styles.emptyText}>
                {t.ui.noCategoriesAvailableDesc}
              </Text>
            </View>
          )
        ) : offer.applies_to === "order" && offer.type !== "bogo" ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t.ui.wholeCartOffer}</Text>
            <Text style={styles.emptyText}>{t.ui.wholeCartOfferDesc}</Text>
          </View>
        ) : !hasItems ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t.ui.noItemsAvailable}</Text>
            <Text style={styles.emptyText}>{t.ui.noItemsAvailableDesc}</Text>
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
                      <Image
                        source={{ uri: item.image }}
                        style={styles.productImage}
                      />
                    )}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {getName(item)}
                      </Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceText}>
                          {item.discounted_price !== null
                            ? formatPrice(item.discounted_price)
                            : formatPrice(item.price)}{" "}
                          {t.common.currency}
                        </Text>
                        {item.discounted_price !== null && (
                          <Text style={styles.originalPrice}>
                            {formatPrice(item.price)} {t.common.currency}
                          </Text>
                        )}
                      </View>
                      {item.discounted_price !== null && (
                        <Text style={styles.offerHint}>
                          {t.ui.offerPriceApplied}
                        </Text>
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
  categoryList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  categoryRow: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  categoryCard: {
    width: CATEGORY_CARD_WIDTH,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    backgroundColor: Colors.neutralWhite,
  },
  categoryCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  cardBackground: {
    width: "100%",
    height: "100%",
  },
  cardImage: {
    borderRadius: 16,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  categoryName: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold as "700",
    color: Colors.neutralWhite,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  categoryBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: Colors.primary900,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: "center",
  },
  categoryBadgeText: {
    color: Colors.neutralWhite,
    fontSize: 11,
    fontWeight: "700",
  },
  offerBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: Colors.accentOrange,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offerBadgeText: {
    color: Colors.neutralWhite,
    fontSize: 11,
    fontWeight: "700",
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
